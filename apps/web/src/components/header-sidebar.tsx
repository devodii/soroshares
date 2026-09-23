"use client";

import { CircleHelpIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { GithubIcon } from "@/components/icons/github";
import { MarkdownDialog } from "@/components/markdown-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const EXPLAINER_TITLE = "How this fixes oversubscription";

export function HeaderSidebar({ explainer }: { explainer: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Sidebar side="right">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <MarkdownDialog
                title={EXPLAINER_TITLE}
                content={explainer}
                trigger={<SidebarMenuButton />}
                triggerContent={
                  <>
                    <CircleHelpIcon />
                    How this works
                  </>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <a
                    href="https://github.com/devodii/soroshares"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <GithubIcon className="size-4" />
                GitHub
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
