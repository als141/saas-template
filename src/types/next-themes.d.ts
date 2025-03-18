// next-themesのための型定義
declare module 'next-themes' {
    export interface ThemeProviderProps {
      attribute?: string
      defaultTheme?: string
      enableSystem?: boolean
      storageKey?: string
      forcedTheme?: string
      disableTransitionOnChange?: boolean
      themes?: string[]
      children?: React.ReactNode
    }
    
    export function ThemeProvider(props: ThemeProviderProps): JSX.Element
  
    export function useTheme(): {
      theme: string | undefined
      setTheme: (theme: string) => void
      resolvedTheme: string | undefined
      themes: string[]
      systemTheme: string | undefined
    }
  }
  
  declare module 'next-themes/dist/types' {
    export interface ThemeProviderProps {
      attribute?: string
      defaultTheme?: string
      enableSystem?: boolean
      storageKey?: string
      forcedTheme?: string
      disableTransitionOnChange?: boolean
      themes?: string[]
      children?: React.ReactNode
    }
  }