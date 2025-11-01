#include "wgc_helper.h"
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <windows.graphics.directx.direct3d11.interop.h>
#include <chrono>
#include <thread>

using namespace winrt;
using namespace winrt::Windows::Graphics::Capture;
using namespace winrt::Windows::Graphics::DirectX;
using namespace winrt::Windows::Graphics::DirectX::Direct3D11;

namespace wgc {

CaptureSession::CaptureSession(HWND hwnd, const CaptureOptions& opts)
    : m_hwnd(hwnd)
    , m_options(opts)
{
    // Initialize COM for MF
    CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    MFStartup(MF_VERSION);

    // Create D3D device
    m_d3dDevice = CreateD3DDevice();
    m_d3dDevice->GetImmediateContext(m_d3dContext.put());

    // Create WIC factory
    check_hresult(CoCreateInstance(
        CLSID_WICImagingFactory,
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(m_wicFactory.put())
    ));
}

CaptureSession::~CaptureSession() {
    Stop();
    MFShutdown();
    CoUninitialize();
}

bool CaptureSession::Start() {
    try {
        // Create capture item
        m_item = CreateCaptureItemForWindow(m_hwnd);
        auto size = m_item.Size();

        // Create Direct3D device wrapper
        auto device = CreateDirect3DDevice(m_d3dDevice.get());

        // Create frame pool
        m_framePool = Direct3D11CaptureFramePool::Create(
            device,
            DirectXPixelFormat::B8G8R8A8UIntNormalized,
            2, // number of buffers
            size
        );

        // Hook frame arrived event
        m_frameArrivedToken = m_framePool.FrameArrived({ this, &CaptureSession::OnFrameArrived });

        // Create named pipe for output
        std::wstring pipePath = L"\\\\.\\pipe\\" + m_options.pipeName;

        m_pipe = CreateNamedPipeW(
            pipePath.c_str(),
            PIPE_ACCESS_OUTBOUND,
            PIPE_TYPE_BYTE | PIPE_WAIT,
            1, // max instances
            65536, // out buffer size
            0, // in buffer size
            0, // timeout
            nullptr
        );

        if (m_pipe == INVALID_HANDLE_VALUE) {
            throw std::runtime_error("Failed to create named pipe");
        }

        // Wait for client to connect (async in real implementation)
        std::thread([this]() {
            if (!ConnectNamedPipe(m_pipe, nullptr)) {
                if (GetLastError() != ERROR_PIPE_CONNECTED) {
                    std::cerr << "Failed to connect pipe\n";
                    return;
                }
            }
            std::cerr << "Pipe connected\n";
        }).detach();

        // Start capture session
        m_session = m_framePool.CreateCaptureSession(m_item);
        m_session.StartCapture();

        m_running = true;

        std::cerr << "Capture session started for HWND " << m_hwnd
                  << " (" << size.Width << "x" << size.Height << ")\n";

        return true;
    }
    catch (const std::exception& e) {
        std::cerr << "Failed to start capture: " << e.what() << "\n";
        return false;
    }
}

void CaptureSession::Stop() {
    if (!m_running) return;

    m_running = false;

    if (m_frameArrivedToken.value != 0) {
        m_framePool.FrameArrived(m_frameArrivedToken);
        m_frameArrivedToken = {};
    }

    if (m_session) {
        m_session.Close();
        m_session = nullptr;
    }

    if (m_framePool) {
        m_framePool.Close();
        m_framePool = nullptr;
    }

    if (m_pipe != INVALID_HANDLE_VALUE) {
        CloseHandle(m_pipe);
        m_pipe = INVALID_HANDLE_VALUE;
    }

    m_item = nullptr;
}

void CaptureSession::OnFrameArrived(
    Direct3D11CaptureFramePool const& sender,
    winrt::Windows::Foundation::IInspectable const& args)
{
    if (!m_running) return;

    auto frame = sender.TryGetNextFrame();
    if (!frame) return;

    auto surface = frame.Surface();

    // Get ID3D11Texture2D from surface
    auto access = surface.as<::Windows::Graphics::DirectX::Direct3D11::IDirect3DDxgiInterfaceAccess>();
    com_ptr<IDXGISurface> dxgiSurface;
    if (FAILED(access->GetInterface(guid_of<IDXGISurface>(), dxgiSurface.put_void()))) {
        return;
    }

    com_ptr<ID3D11Resource> resource;
    if (FAILED(dxgiSurface->QueryInterface(resource.put()))) {
        return;
    }

    com_ptr<ID3D11Texture2D> texture;
    resource.as(texture);

    // Encode and send
    if (!EncodeAndSendFrame(texture.get())) {
        std::cerr << "Failed to encode/send frame\n";
    }

    // Frame rate limiting
    static auto lastFrameTime = std::chrono::high_resolution_clock::now();
    auto now = std::chrono::high_resolution_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastFrameTime).count();
    auto targetFrameTime = 1000 / m_options.fps;

    if (elapsed < targetFrameTime) {
        std::this_thread::sleep_for(std::chrono::milliseconds(targetFrameTime - elapsed));
    }

    lastFrameTime = std::chrono::high_resolution_clock::now();
}

bool CaptureSession::EncodeAndSendFrame(ID3D11Texture2D* texture) {
    try {
        // Encode to JPEG
        auto jpegData = EncodeTextureToJPEG(m_d3dDevice.get(), texture, m_options.jpegQuality);

        // Write length prefix (uint32 little-endian)
        uint32_t length = static_cast<uint32_t>(jpegData.size());
        DWORD written;

        if (!WriteFile(m_pipe, &length, sizeof(length), &written, nullptr)) {
            if (GetLastError() == ERROR_NO_DATA || GetLastError() == ERROR_BROKEN_PIPE) {
                m_running = false;
                return false;
            }
            return false;
        }

        // Write JPEG data
        if (!WriteFile(m_pipe, jpegData.data(), static_cast<DWORD>(jpegData.size()), &written, nullptr)) {
            if (GetLastError() == ERROR_NO_DATA || GetLastError() == ERROR_BROKEN_PIPE) {
                m_running = false;
                return false;
            }
            return false;
        }

        return true;
    }
    catch (const std::exception& e) {
        std::cerr << "Encode error: " << e.what() << "\n";
        return false;
    }
}

} // namespace wgc
