import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            className="ghost-button theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{ padding: '0.375rem', borderRadius: '50%' }}
        >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
        </button>
    );
}
