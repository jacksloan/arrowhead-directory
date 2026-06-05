export type ThemeStyles = Record<string, string>;

export type ThemePreset = {
	label: string;
	createdAt?: string;
	styles: {
		light: ThemeStyles;
		dark: ThemeStyles;
	};
};
