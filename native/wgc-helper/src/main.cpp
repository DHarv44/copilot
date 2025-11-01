#include "wgc_helper.h"
#include <iostream>
#include <string>
#include <sstream>
#include <iomanip>
#include <dwmapi.h>
#include <windows.graphics.capture.interop.h>

using namespace wgc;

// JSON encoding helpers
std::string EscapeJSON(const std::wstring& str) {
    if (str.empty()) {
        return "";
    }

    // Convert wstring to UTF-8 using Windows API
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, str.c_str(), (int)str.length(), NULL, 0, NULL, NULL);
    if (size_needed <= 0) {
        return "";
    }

    std::string utf8(size_needed, 0);
    int result = WideCharToMultiByte(CP_UTF8, 0, str.c_str(), (int)str.length(), &utf8[0], size_needed, NULL, NULL);
    if (result <= 0) {
        return "";
    }

    std::string escaped;
    escaped.reserve(utf8.length() * 2); // Pre-allocate to avoid reallocations

    for (size_t i = 0; i < utf8.length(); i++) {
        unsigned char c = static_cast<unsigned char>(utf8[i]);
        switch (c) {
            case '"': escaped += "\\\""; break;
            case '\\': escaped += "\\\\"; break;
            case '\b': escaped += "\\b"; break;
            case '\f': escaped += "\\f"; break;
            case '\n': escaped += "\\n"; break;
            case '\r': escaped += "\\r"; break;
            case '\t': escaped += "\\t"; break;
            default:
                if (c < 0x20) {
                    char buf[16]; // Increased buffer size for safety
                    sprintf_s(buf, sizeof(buf), "\\u%04x", (unsigned int)c);
                    escaped += buf;
                } else {
                    escaped += c;
                }
        }
    }
    return escaped;
}

void PrintUsage() {
    std::cerr << "Usage:\n";
    std::cerr << "  wgc-helper --list\n";
    std::cerr << "  wgc-helper --thumb <hwnd> <width> <height>\n";
    std::cerr << "  wgc-helper --capture <hwnd> --pipe <pipe_name> [--fps <fps>] [--jpeg-q <quality>]\n";
    std::cerr << "  wgc-helper --position <hwnd> <x> <y> <width> <height> [--topmost] [--borderless]\n";
    std::cerr << "  wgc-helper --inspect <hwnd>\n";
    std::cerr << "\nCommands:\n";
    std::cerr << "  --list                List all capturable windows as JSON\n";
    std::cerr << "  --thumb               Generate window thumbnail PNG to stdout\n";
    std::cerr << "  --capture             Start capture session with MJPEG over named pipe\n";
    std::cerr << "  --position            Position and resize window\n";
    std::cerr << "  --inspect             Inspect window flags and WGC capability\n";
    std::cerr << "\nOptions:\n";
    std::cerr << "  --fps <n>             Frame rate (default: 30)\n";
    std::cerr << "  --jpeg-q <n>          JPEG quality 1-100 (default: 80)\n";
    std::cerr << "  --topmost             Make window always on top\n";
    std::cerr << "  --borderless          Remove window borders/titlebar\n";
}

int HandleList() {
    try {
        auto windows = EnumerateWindows();

        std::cout << "[";
        for (size_t i = 0; i < windows.size(); i++) {
            const auto& win = windows[i];
            if (i > 0) std::cout << ",";

            std::cout << "{"
                      << "\"hwnd\":" << reinterpret_cast<uintptr_t>(win.hwnd) << ","
                      << "\"title\":\"" << EscapeJSON(win.title) << "\","
                      << "\"pid\":" << win.pid << ","
                      << "\"rect\":{"
                      << "\"x\":" << win.rect.left << ","
                      << "\"y\":" << win.rect.top << ","
                      << "\"w\":" << (win.rect.right - win.rect.left) << ","
                      << "\"h\":" << (win.rect.bottom - win.rect.top)
                      << "}}";
        }
        std::cout << "]\n";
        std::cout.flush();

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
}

int HandleThumbnail(HWND hwnd, int width, int height) {
    try {
        auto pngData = GenerateThumbnail(hwnd, width, height);

        // Write raw PNG bytes to stdout
        std::cout.write(reinterpret_cast<const char*>(pngData.data()), pngData.size());
        std::cout.flush();

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error generating thumbnail: " << e.what() << "\n";
        return 1;
    }
}

int HandleCapture(HWND hwnd, const CaptureOptions& opts) {
    try {
        CaptureSession session(hwnd, opts);

        if (!session.Start()) {
            std::cerr << "Failed to start capture session\n";
            return 1;
        }

        std::cerr << "Capture started. Press Ctrl+C to stop.\n";

        // Run until interrupted
        while (session.IsRunning()) {
            Sleep(100);
        }

        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error during capture: " << e.what() << "\n";
        return 1;
    }
}

int HandlePosition(HWND hwnd, int x, int y, int width, int height, bool topmost, bool borderless) {
    try {
        if (!IsWindow(hwnd)) {
            std::cerr << "Invalid window handle\n";
            return 1;
        }

        // Set topmost if requested
        HWND insertAfter = topmost ? HWND_TOPMOST : HWND_NOTOPMOST;

        // Remove borders if requested
        if (borderless) {
            LONG_PTR style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZE | WS_MAXIMIZE | WS_SYSMENU);
            style |= WS_POPUP;
            SetWindowLongPtrW(hwnd, GWL_STYLE, style);

            LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            exStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle);

            // Apply the style change immediately
            SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
        }

        // Position and resize the window
        UINT flags = SWP_NOACTIVATE | SWP_FRAMECHANGED;

        if (!SetWindowPos(hwnd, insertAfter, x, y, width, height, flags)) {
            std::cerr << "Failed to position window\n";
            return 1;
        }

        std::cerr << "Window positioned successfully\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error positioning window: " << e.what() << "\n";
        return 1;
    }
}

int wmain(int argc, wchar_t* argv[]) {
    try {
        // Initialize COM and WinRT
        winrt::init_apartment(winrt::apartment_type::multi_threaded);


        if (argc < 2) {
            PrintUsage();
            return 1;
        }

        std::wstring command = argv[1];

    if (command == L"--list") {
        return HandleList();
    }
    else if (command == L"--thumb") {
        if (argc < 5) {
            std::cerr << "Usage: wgc-helper --thumb <hwnd> <width> <height>\n";
            return 1;
        }

        HWND hwnd = reinterpret_cast<HWND>(std::stoull(argv[2]));
        int width = std::stoi(argv[3]);
        int height = std::stoi(argv[4]);

        return HandleThumbnail(hwnd, width, height);
    }
    else if (command == L"--capture") {
        if (argc < 5 || std::wstring(argv[3]) != L"--pipe") {
            std::cerr << "Usage: wgc-helper --capture <hwnd> --pipe <pipe_name> [--fps <fps>] [--jpeg-q <quality>]\n";
            return 1;
        }

        HWND hwnd = reinterpret_cast<HWND>(std::stoull(argv[2]));
        CaptureOptions opts;
        opts.pipeName = argv[4];

        // Parse optional arguments
        for (int i = 5; i < argc; i++) {
            std::wstring arg = argv[i];
            if (arg == L"--fps" && i + 1 < argc) {
                opts.fps = std::stoi(argv[++i]);
            }
            else if (arg == L"--jpeg-q" && i + 1 < argc) {
                opts.jpegQuality = std::stoi(argv[++i]);
            }
        }

        return HandleCapture(hwnd, opts);
    }
    else if (command == L"--position") {
        if (argc < 7) {
            std::cerr << "Usage: wgc-helper --position <hwnd> <x> <y> <width> <height> [--topmost] [--borderless]\n";
            return 1;
        }

        HWND hwnd = reinterpret_cast<HWND>(std::stoull(argv[2]));
        int x = std::stoi(argv[3]);
        int y = std::stoi(argv[4]);
        int width = std::stoi(argv[5]);
        int height = std::stoi(argv[6]);

        bool topmost = false;
        bool borderless = false;

        // Parse optional flags
        for (int i = 7; i < argc; i++) {
            std::wstring arg = argv[i];
            if (arg == L"--topmost") {
                topmost = true;
            }
            else if (arg == L"--borderless") {
                borderless = true;
            }
        }

        return HandlePosition(hwnd, x, y, width, height, topmost, borderless);
    }
    else if (command == L"--inspect") {
        if (argc < 3) {
            std::cerr << "Usage: wgc-helper --inspect <hwnd>\n";
            return 1;
        }

        HWND hwnd = reinterpret_cast<HWND>(std::stoull(argv[2]));

        // Basic info
        int length = GetWindowTextLengthW(hwnd);
        std::wstring title(length > 0 ? length + 1 : 1, L'\0');
        if (length > 0) {
            GetWindowTextW(hwnd, &title[0], length + 1);
            title.resize(length);
        } else {
            title = L"";
        }

        DWORD pid = 0;
        GetWindowThreadProcessId(hwnd, &pid);

        LONG_PTR style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);

        // Cloaked state
        DWORD cloaked = 0;
        DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked, sizeof(cloaked));

        // Display affinity
        DWORD affinity = 0;
        BOOL hasAffinity = GetWindowDisplayAffinity(hwnd, &affinity);

        // Try WGC CreateForWindow and capture HRESULT
        HRESULT wgcHr = S_OK;
        try {
            auto item = wgc::CreateCaptureItemForWindow(hwnd);
            (void)item;
        } catch (const std::exception&) {
            // Try to retrieve last error via interop call to get HRESULT
            auto interop = winrt::get_activation_factory<winrt::Windows::Graphics::Capture::GraphicsCaptureItem, IGraphicsCaptureItemInterop>();
            winrt::Windows::Graphics::Capture::GraphicsCaptureItem item{ nullptr };
            wgcHr = interop->CreateForWindow(
                hwnd,
                winrt::guid_of<ABI::Windows::Graphics::Capture::IGraphicsCaptureItem>(),
                reinterpret_cast<void**>(winrt::put_abi(item))
            );
        }

        // Print results as JSON
        auto to_hex = [](DWORD v) {
            std::ostringstream oss; oss << "0x" << std::hex << std::uppercase << v; return oss.str();
        };

        std::wcout << L"{\n";
        std::wcout << L"  \"hwnd\": " << reinterpret_cast<uintptr_t>(hwnd) << L",\n";
        std::wcout << L"  \"title\": \"" << EscapeJSON(title).c_str() << L"\",\n";
        std::wcout << L"  \"pid\": " << pid << L",\n";
        std::wcout << L"  \"style\": \"" << to_hex(static_cast<DWORD>(style)).c_str() << L"\",\n";
        std::wcout << L"  \"exStyle\": \"" << to_hex(static_cast<DWORD>(exStyle)).c_str() << L"\",\n";
        std::wcout << L"  \"isCloaked\": " << (cloaked ? L"true" : L"false") << L",\n";
        if (hasAffinity) {
            std::wcout << L"  \"displayAffinity\": \"" << to_hex(affinity).c_str() << L"\",\n";
        } else {
            std::wcout << L"  \"displayAffinity\": null,\n";
        }
        if (wgcHr != S_OK) {
            std::wcout << L"  \"wgcCreateForWindowHr\": \"" << to_hex(static_cast<DWORD>(wgcHr)).c_str() << L"\"\n";
        } else {
            std::wcout << L"  \"wgcCreateForWindowHr\": null\n";
        }
        std::wcout << L"}\n";

        return 0;
    }
    else {
        // Convert wstring command to UTF-8 for error message
        int size_needed = WideCharToMultiByte(CP_UTF8, 0, command.c_str(), (int)command.length(), NULL, 0, NULL, NULL);
        std::string utf8cmd(size_needed, 0);
        WideCharToMultiByte(CP_UTF8, 0, command.c_str(), (int)command.length(), &utf8cmd[0], size_needed, NULL, NULL);

        std::cerr << "Unknown command: " << utf8cmd << "\n";
        PrintUsage();
        return 1;
    }
    } catch (const winrt::hresult_error& e) {
        std::cerr << "WinRT error: " << winrt::to_string(e.message()) << " (0x" << std::hex << static_cast<uint32_t>(e.code()) << ")\n";
        return 1;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    } catch (...) {
        std::cerr << "Unknown fatal error\n";
        return 1;
    }

    return 0;
}
