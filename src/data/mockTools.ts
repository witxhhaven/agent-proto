import type { McpTool } from "@/types";

export const mockTools: McpTool[] = [
  // Google Workspace
  { id: "g_gmail_send", name: "Gmail — Send email", provider: "Google Workspace", providerBrand: "google", category: "Email" },
  { id: "g_gmail_search", name: "Gmail — Search inbox", provider: "Google Workspace", providerBrand: "google", category: "Email" },
  { id: "g_cal_create", name: "Google Calendar — Create event", provider: "Google Workspace", providerBrand: "google", category: "Calendar" },
  { id: "g_cal_free", name: "Google Calendar — Find availability", provider: "Google Workspace", providerBrand: "google", category: "Calendar" },
  { id: "g_drive_search", name: "Google Drive — Search files", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  { id: "g_drive_read", name: "Google Drive — Read document", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  { id: "g_sheets_append", name: "Google Sheets — Append row", provider: "Google Workspace", providerBrand: "google", category: "Data" },
  { id: "g_docs_create", name: "Google Docs — Create document", provider: "Google Workspace", providerBrand: "google", category: "Files" },
  // Microsoft 365
  { id: "m_outlook_send", name: "Outlook — Send email", provider: "Microsoft 365", providerBrand: "microsoft", category: "Email" },
  { id: "m_outlook_search", name: "Outlook — Search inbox", provider: "Microsoft 365", providerBrand: "microsoft", category: "Email" },
  { id: "m_teams_post", name: "Microsoft Teams — Post message", provider: "Microsoft 365", providerBrand: "microsoft", category: "Chat" },
  { id: "m_onedrive_search", name: "OneDrive — Search files", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files" },
  { id: "m_excel_append", name: "Excel — Append row", provider: "Microsoft 365", providerBrand: "microsoft", category: "Data" },
  { id: "m_sharepoint", name: "SharePoint — Search site", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files" },
  { id: "m_cal_create", name: "Microsoft Calendar — Create event", provider: "Microsoft 365", providerBrand: "microsoft", category: "Calendar" },
];

export const toolById = (id: string): McpTool | undefined =>
  mockTools.find((t) => t.id === id);
