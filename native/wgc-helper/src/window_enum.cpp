#include "wgc_helper.h"
#include <dwmapi.h>
#include <vector>
#include <string>

#pragma comment(lib, "dwmapi.lib")

namespace wgc {

static std::vector<WindowInfo>* g_windows = nullptr;

static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    // Skip invisible windows
    if (!IsWindowVisible(hwnd)) {
        return TRUE;
    }

    // Skip cloaked windows (Windows 8+)
    DWORD cloaked = 0;
    if (SUCCEEDED(DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked, sizeof(cloaked)))) {
        if (cloaked) {
            return TRUE;
        }
    }

    // Skip windows with no title
    int length = GetWindowTextLengthW(hwnd);
    if (length == 0) {
        return TRUE;
    }

    // Get window title
    std::wstring title(length + 1, L'\0');
    GetWindowTextW(hwnd, &title[0], length + 1);
    title.resize(length);

    // Get process ID
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);

    // Get window rect
    RECT rect;
    if (!GetWindowRect(hwnd, &rect)) {
        return TRUE;
    }

    // Skip zero-size windows
    if (rect.right <= rect.left || rect.bottom <= rect.top) {
        return TRUE;
    }

    // Add to list
    WindowInfo info;
    info.hwnd = hwnd;
    info.title = title;
    info.pid = pid;
    info.rect = rect;

    g_windows->push_back(info);

    return TRUE;
}

std::vector<WindowInfo> EnumerateWindows() {
    std::vector<WindowInfo> windows;
    g_windows = &windows;

    EnumWindows(EnumWindowsProc, 0);

    g_windows = nullptr;
    return windows;
}

} // namespace wgc
