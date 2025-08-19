// SEO utilities for Cologne Raves

export function generateEventSchema(party: any, index: number) {
  const eventDate = new Date(party.date);
  const doorTime = party.time || "23:00";
  
  return {
    "@type": "MusicEvent",
    "@id": `https://cologne.ravers.workers.dev/#event-${index}`,
    "name": party.venue || "Electronic Music Event",
    "startDate": `${party.date}T${doorTime}:00+02:00`,
    "endDate": `${party.date}T06:00:00+02:00`,
    "location": {
      "@type": "Place",
      "name": party.venue,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Cologne",
        "addressRegion": "NRW",
        "addressCountry": "DE"
      }
    },
    "performer": party.lineup ? party.lineup.map((artist: string) => ({
      "@type": "PerformingGroup",
      "name": artist
    })) : [],
    "organizer": {
      "@type": "Organization",
      "name": party.venue || "Cologne Venue"
    },
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "genre": ["Electronic Music", "Techno", "House"],
    "description": `${party.venue} presents electronic music featuring ${party.lineup?.join(', ') || 'various artists'}`
  };
}

export function getVenueKeywords(venue: string): string {
  const venueKeywords: Record<string, string> = {
    "Gewölbe": "gewölbe cologne, gewölbe köln techno",
    "Odonien": "odonien cologne, odonien köln electronic",
    "Bootshaus": "bootshaus cologne, bootshaus köln edm",
    "Artheater": "artheater cologne, artheater köln underground",
    "Jaki": "club jaki cologne, jaki köln techno",
    "Elektroküche": "elektroküche cologne, elektroküche köln house",
    "Studio 672": "studio 672 cologne, studio 672 köln",
    "Heinz Gaul": "heinz gaul cologne, heinz gaul köln",
    "YUCA": "yuca cologne, yuca köln club",
    "Reineke Fuchs": "reineke fuchs cologne, reineke fuchs köln"
  };
  
  return venueKeywords[venue] || "";
}

export function generateBreadcrumb(items: Array<{name: string, url?: string}>) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url || undefined
    }))
  };
}