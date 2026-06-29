// Flat list of mocked folders per drive service, shown after a drive is chosen
// so the user can pick where the agent should work. Keyed by ServiceOption id.
export const driveFolders: Record<string, string[]> = {
  gdrive: [
    "My Drive / Reports",
    "Shared drives / Policy Library",
    "Shared drives / Citizen Cases",
    "Team / Templates",
  ],
  onedrive: [
    "OneDrive / Documents",
    "OneDrive / Reports",
    "OneDrive / Shared",
    "OneDrive / Templates",
  ],
  sharepoint: [
    "SharePoint / Policy Library",
    "SharePoint / Citizen Cases",
    "SharePoint / Comms",
    "SharePoint / Templates",
  ],
};
