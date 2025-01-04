// ...existing code...
interface ConsoleWarnArgs {
    [index: number]: any;
    0?: string;
}

function vn(n: unknown): void {
    // Override console.warn to suppress specific warning messages
    const originalConsoleWarn: typeof console.warn = console.warn;
    console.warn = (...args: any[]) => {
        if (args[0] && args[0].includes('hydration_mismatch')) {
            return;
        }
        originalConsoleWarn(...args);
    };
    // ...existing code...
}
// ...existing code...
