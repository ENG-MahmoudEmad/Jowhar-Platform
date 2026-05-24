import NewsHero from "@/components/dashboard/news/NewsHero";
import NewsFeed from "@/components/dashboard/news/NewsFeed";

export default function NewsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <NewsHero />
      </section>

      <section>
        <NewsFeed />
      </section>
    </div>
  );
}
