/**
 * VirtualList Usage Examples
 *
 * This file demonstrates how to use the VirtualList component
 * in different scenarios within PersonalLog.
 *
 * @module components/ui/VirtualList.example
 */

import { useState, useMemo } from "react";
import { VirtualList } from "./VirtualList";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
}

interface Item {
  id: string;
  name: string;
  date: Date;
  category: string;
}

// ============================================
// EXAMPLE 1: Message List (Fixed Height)
// ============================================

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <VirtualList
      items={messages}
      renderItem={(message) => (
        <div key={message.id} className="p-4 border-b">
          <p>{message.content}</p>
          <span className="text-sm text-gray-500">
            {message.timestamp.toLocaleString()}
          </span>
        </div>
      )}
      itemHeight={80}
      height="calc(100vh - 200px)"
      overscan={5}
      getKey={(msg) => msg.id}
    />
  );
}

// ============================================
// EXAMPLE 2: Conversation List (Dynamic Height)
// ============================================

interface Conversation {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
}

function ConversationList({ conversations }: { conversations: Conversation[] }) {
  return (
    <VirtualList
      items={conversations}
      renderItem={(conversation) => (
        <div className="p-4 border-b hover:bg-gray-50">
          <h3 className="font-semibold">{conversation.title}</h3>
          <p className="text-sm text-gray-600">{conversation.preview}</p>
          <span className="text-xs text-gray-400">
            {conversation.messageCount} messages
          </span>
        </div>
      )}
      height={600}
      itemHeight={100}
      overscan={10}
      getKey={(conv) => conv.id}
    />
  );
}

// ============================================
// EXAMPLE 3: Infinite Scroll (Load More)
// ============================================

function KnowledgeBase({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState(initialArticles);
  const [loading, setLoading] = useState(false);

  const handleLoadMore = async () => {
    if (loading) return;
    setLoading(true);

    // Fetch more articles
    const more = await fetchMoreArticles(articles.length);
    setArticles((prev) => [...prev, ...more]);
    setLoading(false);
  };

  return (
    <VirtualList
      items={articles}
      renderItem={(article) => (
        <article className="p-6 border-b">
          <h2 className="text-xl font-bold">{article.title}</h2>
          <p className="mt-2">{article.excerpt}</p>
          <div className="mt-4 flex gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                {tag}
              </span>
            ))}
          </div>
        </article>
      )}
      height={800}
      itemHeight={200}
      overscan={5}
      getKey={(article) => article.id}
      onLoadMore={handleLoadMore}
      loading={loading}
      loadThreshold={300}
      loadingComponent={
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-2">Loading more articles...</span>
        </div>
      }
    />
  );
}

// ============================================
// EXAMPLE 4: Scroll to Item
// ============================================

function SearchableMessageList({ messages }: { messages: Message[] }) {
  const [scrollToIndex, setScrollToIndex] = useState<number | undefined>(undefined);

  const handleSearch = (query: string) => {
    const index = messages.findIndex((msg) =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
    if (index !== -1) {
      setScrollToIndex(index);
    }
  };

  return (
    <>
      <input
        type="text"
        placeholder="Search messages..."
        onChange={(e) => handleSearch(e.target.value)}
        className="mb-4 p-2 border rounded"
      />
      <VirtualList
        items={messages}
        renderItem={(message) => (
          <div key={message.id} className="p-4 border-b">
            <p>{message.content}</p>
          </div>
        )}
        height={600}
        itemHeight={100}
        scrollToIndex={scrollToIndex}
        getKey={(msg) => msg.id}
      />
    </>
  );
}

// ============================================
// EXAMPLE 5: With Custom Styling
// ============================================

function StyledList({ items }: { items: string[] }) {
  return (
    <VirtualList
      items={items}
      renderItem={(item) => (
        <div className="p-4 bg-white shadow-sm">
          <span className="text-lg">{item}</span>
        </div>
      )}
      height="70vh"
      itemHeight={60}
      overscan={10}
      className="custom-scrollbar"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        backgroundColor: "#f9fafb",
      }}
      onScroll={(scrollTop) => {
        console.log("Scrolled to:", scrollTop);
      }}
    />
  );
}

// ============================================
// EXAMPLE 6: Combined with Filter/Sort
// ============================================

function FilterableList({ allItems }: { allItems: Item[] }) {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");

  const filteredItems = useMemo(() => {
    let items = allItems;

    // Apply filter
    if (filter !== "all") {
      items = items.filter((item) => item.category === filter);
    }

    // Apply sort
    items = [...items].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return b.date.getTime() - a.date.getTime();
      }
    });

    return items;
  }, [allItems, filter, sortBy]);

  return (
    <>
      <div className="flex gap-4 mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
        </select>
        <button onClick={() => setSortBy("name")}>Sort by Name</button>
        <button onClick={() => setSortBy("date")}>Sort by Date</button>
      </div>

      <VirtualList
        items={filteredItems}
        renderItem={(item) => <ItemCard item={item} />}
        height={600}
        itemHeight={120}
        getKey={(item) => item.id}
      />
    </>
  );
}

// ============================================
// HELPER FUNCTIONS & COMPONENTS
// ============================================

// Mock fetch function for Example 3
async function fetchMoreArticles(offset: number): Promise<Article[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return Array.from({ length: 10 }, (_, i) => ({
    id: `article-${offset + i}`,
    title: `Article ${offset + i + 1}`,
    excerpt: `This is an excerpt for article ${offset + i + 1}`,
    tags: ['tag1', 'tag2', 'tag3'],
  }));
}

// ItemCard component for Example 6
function ItemCard({ item }: { item: Item }) {
  return (
    <div className="p-4 border rounded shadow-sm">
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-sm text-gray-500">{item.category}</p>
      <p className="text-xs text-gray-400">{item.date.toLocaleDateString()}</p>
    </div>
  );
}
