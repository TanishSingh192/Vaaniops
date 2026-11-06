export const meta = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — VaaniOps` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — VaaniOps` },
    { property: "og:description", content: description },
  ],
});
