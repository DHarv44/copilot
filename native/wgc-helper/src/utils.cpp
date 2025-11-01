#include "wgc_helper.h"
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <wincodecsdk.h>
#include <stdexcept>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")
#pragma comment(lib, "windowscodecs.lib")

using namespace winrt;
using namespace winrt::Windows::Graphics::Capture;
using namespace winrt::Windows::Graphics::DirectX;
using namespace winrt::Windows::Graphics::DirectX::Direct3D11;

namespace wgc {

// Helper to create Direct3D device from ID3D11Device
IDirect3DDevice CreateDirect3DDevice(ID3D11Device* d3dDevice) {
    com_ptr<IDXGIDevice> dxgiDevice;
    d3dDevice->QueryInterface(dxgiDevice.put());

    com_ptr<IInspectable> inspectable;
    check_hresult(CreateDirect3D11DeviceFromDXGIDevice(dxgiDevice.get(), inspectable.put()));

    return inspectable.as<IDirect3DDevice>();
}

// Create D3D11 device
com_ptr<ID3D11Device> CreateD3DDevice() {
    D3D_FEATURE_LEVEL featureLevels[] = {
        D3D_FEATURE_LEVEL_11_1,
        D3D_FEATURE_LEVEL_11_0,
        D3D_FEATURE_LEVEL_10_1,
        D3D_FEATURE_LEVEL_10_0,
    };

    com_ptr<ID3D11Device> device;
    com_ptr<ID3D11DeviceContext> context;
    D3D_FEATURE_LEVEL featureLevel;

    HRESULT hr = D3D11CreateDevice(
        nullptr,
        D3D_DRIVER_TYPE_HARDWARE,
        nullptr,
        D3D11_CREATE_DEVICE_BGRA_SUPPORT,
        featureLevels,
        ARRAYSIZE(featureLevels),
        D3D11_SDK_VERSION,
        device.put(),
        &featureLevel,
        context.put()
    );

    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create D3D11 device");
    }

    return device;
}

// Create capture item for window
GraphicsCaptureItem CreateCaptureItemForWindow(HWND hwnd) {
    auto interop = get_activation_factory<GraphicsCaptureItem, IGraphicsCaptureItemInterop>();
    GraphicsCaptureItem item{ nullptr };

    HRESULT hr = interop->CreateForWindow(
        hwnd,
        guid_of<ABI::Windows::Graphics::Capture::IGraphicsCaptureItem>(),
        reinterpret_cast<void**>(put_abi(item))
    );

    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create capture item for window");
    }

    return item;
}

// Encode D3D11 texture to PNG
std::vector<uint8_t> EncodeTextureToPNG(ID3D11Device* device, ID3D11Texture2D* texture, int width, int height) {
    HRESULT hr;

    // Create WIC factory
    com_ptr<IWICImagingFactory> wicFactory;
    hr = CoCreateInstance(
        CLSID_WICImagingFactory,
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(wicFactory.put())
    );
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create WIC factory");
    }

    // Create stream
    com_ptr<IWICStream> stream;
    hr = wicFactory->CreateStream(stream.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create WIC stream");
    }

    std::vector<uint8_t> buffer;
    buffer.reserve(width * height * 4); // Rough estimate

    com_ptr<IStream> istream;
    hr = CreateStreamOnHGlobal(nullptr, TRUE, istream.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create IStream");
    }

    hr = stream->InitializeFromIStream(istream.get());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize WIC stream");
    }

    // Create PNG encoder
    com_ptr<IWICBitmapEncoder> encoder;
    hr = wicFactory->CreateEncoder(GUID_ContainerFormatPng, nullptr, encoder.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create PNG encoder");
    }

    hr = encoder->Initialize(stream.get(), WICBitmapEncoderNoCache);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize encoder");
    }

    // Create frame
    com_ptr<IWICBitmapFrameEncode> frame;
    hr = encoder->CreateNewFrame(frame.put(), nullptr);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create frame");
    }

    hr = frame->Initialize(nullptr);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize frame");
    }

    hr = frame->SetSize(width, height);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to set frame size");
    }

    WICPixelFormatGUID pixelFormat = GUID_WICPixelFormat32bppBGRA;
    hr = frame->SetPixelFormat(&pixelFormat);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to set pixel format");
    }

    // Map texture to get pixel data
    com_ptr<ID3D11DeviceContext> context;
    device->GetImmediateContext(context.put());

    D3D11_TEXTURE2D_DESC desc;
    texture->GetDesc(&desc);

    // Create staging texture
    D3D11_TEXTURE2D_DESC stagingDesc = desc;
    stagingDesc.Usage = D3D11_USAGE_STAGING;
    stagingDesc.BindFlags = 0;
    stagingDesc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    stagingDesc.MiscFlags = 0;

    com_ptr<ID3D11Texture2D> stagingTexture;
    hr = device->CreateTexture2D(&stagingDesc, nullptr, stagingTexture.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create staging texture");
    }

    context->CopyResource(stagingTexture.get(), texture);

    // Map and copy pixels
    D3D11_MAPPED_SUBRESOURCE mapped;
    hr = context->Map(stagingTexture.get(), 0, D3D11_MAP_READ, 0, &mapped);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to map texture");
    }

    hr = frame->WritePixels(
        height,
        mapped.RowPitch,
        height * mapped.RowPitch,
        static_cast<BYTE*>(mapped.pData)
    );

    context->Unmap(stagingTexture.get(), 0);

    if (FAILED(hr)) {
        throw std::runtime_error("Failed to write pixels");
    }

    // Commit
    hr = frame->Commit();
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to commit frame");
    }

    hr = encoder->Commit();
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to commit encoder");
    }

    // Read from stream
    STATSTG stats;
    hr = istream->Stat(&stats, STATFLAG_NONAME);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to get stream stats");
    }

    buffer.resize(stats.cbSize.QuadPart);

    LARGE_INTEGER seekPos = { 0 };
    hr = istream->Seek(seekPos, STREAM_SEEK_SET, nullptr);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to seek stream");
    }

    ULONG bytesRead;
    hr = istream->Read(buffer.data(), static_cast<ULONG>(buffer.size()), &bytesRead);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to read from stream");
    }

    buffer.resize(bytesRead);
    return buffer;
}

// Encode D3D11 texture to JPEG
std::vector<uint8_t> EncodeTextureToJPEG(ID3D11Device* device, ID3D11Texture2D* texture, int quality) {
    HRESULT hr;

    // Create WIC factory
    com_ptr<IWICImagingFactory> wicFactory;
    hr = CoCreateInstance(
        CLSID_WICImagingFactory,
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(wicFactory.put())
    );
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create WIC factory");
    }

    // Get texture desc
    D3D11_TEXTURE2D_DESC desc;
    texture->GetDesc(&desc);

    // Create stream
    com_ptr<IStream> istream;
    hr = CreateStreamOnHGlobal(nullptr, TRUE, istream.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create IStream");
    }

    com_ptr<IWICStream> stream;
    hr = wicFactory->CreateStream(stream.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create WIC stream");
    }

    hr = stream->InitializeFromIStream(istream.get());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize WIC stream");
    }

    // Create JPEG encoder
    com_ptr<IWICBitmapEncoder> encoder;
    hr = wicFactory->CreateEncoder(GUID_ContainerFormatJpeg, nullptr, encoder.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create JPEG encoder");
    }

    hr = encoder->Initialize(stream.get(), WICBitmapEncoderNoCache);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize encoder");
    }

    // Create frame
    com_ptr<IWICBitmapFrameEncode> frame;
    com_ptr<IPropertyBag2> props;
    hr = encoder->CreateNewFrame(frame.put(), props.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create frame");
    }

    // Set JPEG quality
    PROPBAG2 option = { 0 };
    option.pstrName = const_cast<LPOLESTR>(L"ImageQuality");
    VARIANT value;
    VariantInit(&value);
    value.vt = VT_R4;
    value.fltVal = quality / 100.0f;
    hr = props->Write(1, &option, &value);
    VariantClear(&value);

    hr = frame->Initialize(props.get());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to initialize frame");
    }

    hr = frame->SetSize(desc.Width, desc.Height);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to set frame size");
    }

    WICPixelFormatGUID pixelFormat = GUID_WICPixelFormat24bppBGR;
    hr = frame->SetPixelFormat(&pixelFormat);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to set pixel format");
    }

    // Map texture
    com_ptr<ID3D11DeviceContext> context;
    device->GetImmediateContext(context.put());

    // Create staging texture
    D3D11_TEXTURE2D_DESC stagingDesc = desc;
    stagingDesc.Usage = D3D11_USAGE_STAGING;
    stagingDesc.BindFlags = 0;
    stagingDesc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    stagingDesc.MiscFlags = 0;

    com_ptr<ID3D11Texture2D> stagingTexture;
    hr = device->CreateTexture2D(&stagingDesc, nullptr, stagingTexture.put());
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to create staging texture");
    }

    context->CopyResource(stagingTexture.get(), texture);

    // Map and convert BGRA to BGR
    D3D11_MAPPED_SUBRESOURCE mapped;
    hr = context->Map(stagingTexture.get(), 0, D3D11_MAP_READ, 0, &mapped);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to map texture");
    }

    std::vector<uint8_t> bgrData(desc.Width * desc.Height * 3);
    const uint8_t* src = static_cast<const uint8_t*>(mapped.pData);

    for (UINT y = 0; y < desc.Height; y++) {
        const uint8_t* srcRow = src + y * mapped.RowPitch;
        uint8_t* dstRow = bgrData.data() + y * desc.Width * 3;

        for (UINT x = 0; x < desc.Width; x++) {
            dstRow[x * 3 + 0] = srcRow[x * 4 + 0]; // B
            dstRow[x * 3 + 1] = srcRow[x * 4 + 1]; // G
            dstRow[x * 3 + 2] = srcRow[x * 4 + 2]; // R
            // Skip alpha
        }
    }

    context->Unmap(stagingTexture.get(), 0);

    hr = frame->WritePixels(
        desc.Height,
        desc.Width * 3,
        static_cast<UINT>(bgrData.size()),
        bgrData.data()
    );
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to write pixels");
    }

    // Commit
    hr = frame->Commit();
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to commit frame");
    }

    hr = encoder->Commit();
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to commit encoder");
    }

    // Read from stream
    STATSTG stats;
    hr = istream->Stat(&stats, STATFLAG_NONAME);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to get stream stats");
    }

    std::vector<uint8_t> buffer(stats.cbSize.QuadPart);

    LARGE_INTEGER seekPos = { 0 };
    hr = istream->Seek(seekPos, STREAM_SEEK_SET, nullptr);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to seek stream");
    }

    ULONG bytesRead;
    hr = istream->Read(buffer.data(), static_cast<ULONG>(buffer.size()), &bytesRead);
    if (FAILED(hr)) {
        throw std::runtime_error("Failed to read from stream");
    }

    buffer.resize(bytesRead);
    return buffer;
}

} // namespace wgc
