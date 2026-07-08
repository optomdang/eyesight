/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_E2E_EXERCISE_DURATION_SECONDS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
