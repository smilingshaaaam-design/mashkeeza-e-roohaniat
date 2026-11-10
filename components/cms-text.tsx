
"use client";

import React, { useEffect, useState } from "react";

const CMS_API =
  "https://mashkeeza-cms-api.smilingshaaaam.workers.dev";

type SiteSettingKey =
  | "site_title"
  | "site_subtitle"
  | "site_footer";

type SiteSettings = Record<SiteSettingKey, string>;

const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "مشکیزہ روحانیت",
  site_subtitle: "علم و معرفت کا روحانی مرکز",
  site_footer: "مشکیزہ روحانیت — التماس دعا سید شاہ",
};

let cachedSettings: SiteSettings | null = null;
let pendingRequest: Promise<SiteSettings> | null = null;

async function fetchSiteSettings(): Promise<SiteSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  if (!pendingRequest) {
    pendingRequest = fetch(`${CMS_API}/public/site-settings`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load website settings");
        }

        const data = await response.json();

        const settings: SiteSettings = {
          site_title:
            typeof data.site_title === "string"
              ? data.site_title
              : DEFAULT_SETTINGS.site_title,

          site_subtitle:
            typeof data.site_subtitle === "string"
              ? data.site_subtitle
              : DEFAULT_SETTINGS.site_subtitle,

          site_footer:
            typeof data.site_footer === "string"
              ? data.site_footer
              : DEFAULT_SETTINGS.site_footer,
        };

        cachedSettings = settings;

        return settings;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
}

interface CmsTextProps {
  settingKey: SiteSettingKey;
  fallback?: string;
  className?: string;
}

export default function CmsText({
  settingKey,
  fallback,
  className,
}: CmsTextProps) {
  const [value, setValue] = useState(
    fallback ?? DEFAULT_SETTINGS[settingKey]
  );

  useEffect(() => {
    let active = true;

    fetchSiteSettings()
      .then((settings) => {
        if (active) {
          setValue(settings[settingKey]);
        }
      })
      .catch((error) => {
        console.error("CMS settings error:", error);
      });

    return () => {
      active = false;
    };
  }, [settingKey]);

  return <span className={className}>{value}</span>;
}
