#pragma once

#include <windows.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <dwmapi.h>
#include <wincodec.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <vector>
#include <string>
#include <memory>
#include <iostream>

namespace wgc {

// Window information
struct WindowInfo {
    HWND hwnd;
    std::wstring title;
    DWORD pid;
    RECT rect;
};

// Capture options
struct CaptureOptions {
    int fps = 30;
    int jpegQuality = 80;
    std::wstring pipeName;
};

// Window enumeration
std::vector<WindowInfo> EnumerateWindows();

// Thumbnail generation
std::vector<uint8_t> GenerateThumbnail(HWND hwnd, int maxWidth, int maxHeight);

// Capture session
class CaptureSession {
public:
    CaptureSession(HWND hwnd, const CaptureOptions& opts);
    ~CaptureSession();

    bool Start();
    void Stop();
    bool IsRunning() const { return m_running; }

private:
    void OnFrameArrived(
        winrt::Windows::Graphics::Capture::Direct3D11CaptureFramePool const& sender,
        winrt::Windows::Foundation::IInspectable const& args);

    bool EncodeAndSendFrame(ID3D11Texture2D* texture);

    HWND m_hwnd;
    CaptureOptions m_options;
    bool m_running = false;

    winrt::Windows::Graphics::Capture::GraphicsCaptureItem m_item{ nullptr };
    winrt::Windows::Graphics::Capture::Direct3D11CaptureFramePool m_framePool{ nullptr };
    winrt::Windows::Graphics::Capture::GraphicsCaptureSession m_session{ nullptr };

    winrt::com_ptr<ID3D11Device> m_d3dDevice;
    winrt::com_ptr<ID3D11DeviceContext> m_d3dContext;
    winrt::com_ptr<IWICImagingFactory> m_wicFactory;

    HANDLE m_pipe = INVALID_HANDLE_VALUE;
    winrt::event_token m_frameArrivedToken;
};

// Utility functions
winrt::com_ptr<ID3D11Device> CreateD3DDevice();
winrt::Windows::Graphics::DirectX::Direct3D11::IDirect3DDevice CreateDirect3DDevice(ID3D11Device* d3dDevice);
winrt::Windows::Graphics::Capture::GraphicsCaptureItem CreateCaptureItemForWindow(HWND hwnd);
std::vector<uint8_t> EncodeTextureToPNG(ID3D11Device* device, ID3D11Texture2D* texture, int width, int height);
std::vector<uint8_t> EncodeTextureToJPEG(ID3D11Device* device, ID3D11Texture2D* texture, int quality);

} // namespace wgc
