import type { McpTool } from "@/types";

export const mockTools: McpTool[] = [
  // Google Workspace
  { id: "g_gmail_send", name: "Gmail — Send email", provider: "Google Workspace", providerBrand: "google", category: "Email", description: "Compose and send emails from the connected Gmail account." },
  { id: "g_gmail_search", name: "Gmail — Search inbox", provider: "Google Workspace", providerBrand: "google", category: "Email", description: "Search the inbox and read message contents and threads." },
  { id: "g_cal_create", name: "Google Calendar — Create event", provider: "Google Workspace", providerBrand: "google", category: "Calendar", description: "Create calendar events with guests, times, and reminders." },
  { id: "g_cal_free", name: "Google Calendar — Find availability", provider: "Google Workspace", providerBrand: "google", category: "Calendar", description: "Check free/busy times to find open meeting slots." },
  { id: "g_drive_search", name: "Google Drive — Search files", provider: "Google Workspace", providerBrand: "google", category: "Files", description: "Find files and folders by name or content in Drive." },
  { id: "g_drive_read", name: "Google Drive — Read document", provider: "Google Workspace", providerBrand: "google", category: "Files", description: "Open and read the contents of a Drive document." },
  { id: "g_sheets_append", name: "Google Sheets — Append row", provider: "Google Workspace", providerBrand: "google", category: "Data", description: "Add a new row of data to a Google Sheet." },
  { id: "g_docs_create", name: "Google Docs — Create document", provider: "Google Workspace", providerBrand: "google", category: "Files", description: "Create a new Google Doc with formatted content." },
  // Microsoft 365
  { id: "m_outlook_send", name: "Outlook — Send email", provider: "Microsoft 365", providerBrand: "microsoft", category: "Email", description: "Compose and send emails from the connected Outlook account." },
  { id: "m_outlook_search", name: "Outlook — Search inbox", provider: "Microsoft 365", providerBrand: "microsoft", category: "Email", description: "Search the Outlook inbox and read messages." },
  { id: "m_teams_post", name: "Microsoft Teams — Post message", provider: "Microsoft 365", providerBrand: "microsoft", category: "Chat", description: "Post a message to a Teams channel or chat." },
  { id: "m_onedrive_search", name: "OneDrive — Search files", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files", description: "Find files and folders stored in OneDrive." },
  { id: "m_onedrive_read", name: "OneDrive — Read document", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files", description: "Open and read the contents of a OneDrive document." },
  { id: "m_word_create", name: "Word — Create document", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files", description: "Create a new Word document with formatted content." },
  { id: "m_excel_append", name: "Excel — Append row", provider: "Microsoft 365", providerBrand: "microsoft", category: "Data", description: "Add a new row of data to an Excel workbook." },
  { id: "m_sharepoint", name: "SharePoint — Search site", provider: "Microsoft 365", providerBrand: "microsoft", category: "Files", description: "Search a SharePoint site for documents and pages." },
  { id: "m_cal_create", name: "Microsoft Calendar — Create event", provider: "Microsoft 365", providerBrand: "microsoft", category: "Calendar", description: "Create Outlook calendar events with guests and times." },
];

export const toolById = (id: string): McpTool | undefined =>
  mockTools.find((t) => t.id === id);
