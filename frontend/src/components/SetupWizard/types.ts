/**
 * Setup Wizard types
 */

export interface SetupStatus {
  setupComplete: boolean;
  checks: {
    configExists: boolean;
    databaseExists: boolean;
    photosDirExists: boolean;
    optimizedDirExists: boolean;
    hasPhotos: boolean;
    isConfigured: boolean;
  };
}

