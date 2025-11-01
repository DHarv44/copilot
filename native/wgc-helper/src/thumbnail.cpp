#include "wgc_helper.h"
#include <d2d1.h>
#include <d2d1helper.h>
#include <wincodec.h>
#include <windows.graphics.directx.direct3d11.interop.h>

#pragma comment(lib, "d2d1.lib")

using namespace winrt;

namespace wgc {

std::vector<uint8_t> GenerateThumbnail(HWND hwnd, int maxWidth, int maxHeight) {
    // Create D3D device
    auto d3dDevice = CreateD3DDevice();

    // Create capture item
    auto item = CreateCaptureItemForWindow(hwnd);
    auto itemSize = item.Size();

    // Calculate scaled dimensions
    float scaleX = static_cast<float>(maxWidth) / itemSize.Width;
    float scaleY = static_cast<float>(maxHeight) / itemSize.Height;
    float scale = min(scaleX, scaleY);

    int thumbWidth = static_cast<int>(itemSize.Width * scale);
    int thumbHeight = static_cast<int>(itemSize.Height * scale);

    // Create frame pool
    auto device = CreateDirect3DDevice(d3dDevice.get());
    auto framePool = winrt::Windows::Graphics::Capture::Direct3D11CaptureFramePool::Create(
        device,
        winrt::Windows::Graphics::DirectX::DirectXPixelFormat::B8G8R8A8UIntNormalized,
        1, // number of buffers
        itemSize
    );

    // Start capture session
    auto session = framePool.CreateCaptureSession(item);
    session.StartCapture();

    // Wait for first frame
    com_ptr<ID3D11Texture2D> capturedTexture;
    auto frameArrivedEvent = CreateEventW(nullptr, FALSE, FALSE, nullptr);

    auto token = framePool.FrameArrived([&](auto&& sender, auto&& args) {
        auto frame = sender.TryGetNextFrame();
        if (frame) {
            auto surface = frame.Surface();

            // Get ID3D11Texture2D from surface
            auto access = surface.as<::Windows::Graphics::DirectX::Direct3D11::IDirect3DDxgiInterfaceAccess>();
            com_ptr<IDXGISurface> dxgiSurface;
            check_hresult(access->GetInterface(guid_of<IDXGISurface>(), dxgiSurface.put_void()));

            com_ptr<ID3D11Resource> resource;
            check_hresult(dxgiSurface->QueryInterface(resource.put()));
            resource.as(capturedTexture);

            SetEvent(frameArrivedEvent);
        }
    });

    // Wait up to 3 seconds for frame, pumping messages
    DWORD startTime = GetTickCount();
    DWORD timeout = 3000;
    while (GetTickCount() - startTime < timeout) {
        DWORD result = MsgWaitForMultipleObjects(1, &frameArrivedEvent, FALSE, 100, QS_ALLINPUT);
        if (result == WAIT_OBJECT_0) {
            break; // Event signaled
        }
        // Pump messages to allow COM events to be processed
        MSG msg;
        while (PeekMessageW(&msg, nullptr, 0, 0, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
    CloseHandle(frameArrivedEvent);

    framePool.FrameArrived(token);
    session.Close();
    framePool.Close();

    if (!capturedTexture) {
        throw std::runtime_error("Failed to capture frame for thumbnail");
    }

    // Scale down if needed
    com_ptr<ID3D11Texture2D> scaledTexture;

    if (thumbWidth != itemSize.Width || thumbHeight != itemSize.Height) {
        // Create smaller texture
        D3D11_TEXTURE2D_DESC scaledDesc = {};
        scaledDesc.Width = thumbWidth;
        scaledDesc.Height = thumbHeight;
        scaledDesc.MipLevels = 1;
        scaledDesc.ArraySize = 1;
        scaledDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
        scaledDesc.SampleDesc.Count = 1;
        scaledDesc.Usage = D3D11_USAGE_DEFAULT;
        scaledDesc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;

        check_hresult(d3dDevice->CreateTexture2D(&scaledDesc, nullptr, scaledTexture.put()));

        // Scale using D2D (high quality)
        com_ptr<ID2D1Factory> d2dFactory;
        D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, d2dFactory.put());

        com_ptr<IDXGISurface> scaledSurface;
        scaledTexture.as(scaledSurface);

        com_ptr<ID2D1RenderTarget> renderTarget;
        D2D1_RENDER_TARGET_PROPERTIES props = D2D1::RenderTargetProperties(
            D2D1_RENDER_TARGET_TYPE_DEFAULT,
            D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_PREMULTIPLIED)
        );

        check_hresult(d2dFactory->CreateDxgiSurfaceRenderTarget(
            scaledSurface.get(),
            &props,
            renderTarget.put()
        ));

        // Create bitmap from source texture
        com_ptr<IDXGISurface> sourceSurface;
        capturedTexture.as(sourceSurface);

        com_ptr<ID2D1Bitmap> sourceBitmap;
        D2D1_BITMAP_PROPERTIES bitmapProps = D2D1::BitmapProperties(
            D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_PREMULTIPLIED)
        );

        check_hresult(renderTarget->CreateSharedBitmap(
            __uuidof(IDXGISurface),
            sourceSurface.get(),
            &bitmapProps,
            sourceBitmap.put()
        ));

        // Draw scaled
        renderTarget->BeginDraw();
        renderTarget->SetAntialiasMode(D2D1_ANTIALIAS_MODE_PER_PRIMITIVE);

        D2D1_RECT_F destRect = D2D1::RectF(0, 0, static_cast<float>(thumbWidth), static_cast<float>(thumbHeight));
        renderTarget->DrawBitmap(
            sourceBitmap.get(),
            &destRect,
            1.0f,
            D2D1_BITMAP_INTERPOLATION_MODE_LINEAR
        );

        check_hresult(renderTarget->EndDraw());
    } else {
        scaledTexture = capturedTexture;
    }

    // Encode to PNG
    return EncodeTextureToPNG(d3dDevice.get(), scaledTexture.get(), thumbWidth, thumbHeight);
}

} // namespace wgc
