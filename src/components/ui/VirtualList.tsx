/**
 * VirtualList Component
 *
 * High-performance list component using windowed rendering.
 * Only renders items visible in viewport + buffer for smooth scrolling.
 *
 * Supports:
 * - Dynamic item heights
 * - Scroll-to-item
 * - Loading indicators
 * - Infinite scroll
 *
 * @module components/ui/VirtualList
 */

"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ComponentType,
} from "react";

export interface VirtualListProps<T> {
  /**
   * Array of items to render
   */
  items: T[];

  /**
   * Render function for each item
   */
  renderItem: (item: T, index: number) => React.ReactNode;

  /**
   * Estimated height of each item (for initial calculation)
   * @default 50
   */
  itemHeight?: number;

  /**
   * Height of the container/viewport
   * @default 600
   */
  height?: number | string;

  /**
   * Number of items to render outside viewport (buffer)
   * @default 5
   */
  overscan?: number;

  /**
   * Enable dynamic height measurement
   * @default false
   */
  dynamicHeight?: boolean;

  /**
   * Unique key selector for items
   * @default (item, index) => index
   */
  getKey?: (item: T, index: number) => string | number;

  /**
   * Loading state (shows loading indicator)
   */
  loading?: boolean;

  /**
   * Loading component to render
   */
  loadingComponent?: React.ReactNode;

  /**
   * Function called when scrolling near bottom (for infinite scroll)
   */
  onLoadMore?: () => void;

  /**
   * Threshold for triggering load more (pixels from bottom)
   * @default 200
   */
  loadThreshold?: number;

  /**
   * Scroll to specific item index
   */
  scrollToIndex?: number;

  /**
   * Scroll alignment when using scrollToIndex
   * @default "start"
   */
  scrollAlignment?: "start" | "center" | "end" | "nearest";

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Additional styles
   */
  style?: React.CSSProperties;

  /**
   * Called when scroll position changes
   */
  onScroll?: (scrollTop: number) => void;
}

/**
 * VirtualList Component
 *
 * Efficiently renders large lists by only showing visible items.
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={messages}
 *   renderItem={(msg) => <MessageItem message={msg} />}
 *   height="600px"
 *   itemHeight={80}
 *   overscan={5}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight: estimatedItemHeight = 50,
  height = 600,
  overscan = 5,
  dynamicHeight = false,
  getKey = (_item, index) => index,
  loading = false,
  loadingComponent,
  onLoadMore,
  loadThreshold = 200,
  scrollToIndex,
  scrollAlignment = "start",
  className = "",
  style = {},
  onScroll,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store measured heights for dynamic sizing
  const itemHeights = useRef<Record<number, number>>({});
  const totalHeight = useMemo(() => {
    if (!dynamicHeight) {
      return items.length * estimatedItemHeight;
    }

    // Calculate total height based on measured items + estimates
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += itemHeights.current[i] || estimatedItemHeight;
    }
    return total;
  }, [items.length, estimatedItemHeight, dynamicHeight]);

  // Calculate visible range
  const { visibleRange, startIndex, endIndex } = useMemo(() => {
    const containerHeight =
      typeof height === "number" ? height : parseInt(height) || 600;

    let start = 0;
    let currentHeight = 0;

    // Find start index based on scroll position
    if (dynamicHeight) {
      for (let i = 0; i < items.length; i++) {
        const itemH = itemHeights.current[i] || estimatedItemHeight;
        if (currentHeight + itemH > scrollTop) {
          start = i;
          break;
        }
        currentHeight += itemH;
      }
    } else {
      start = Math.floor(scrollTop / estimatedItemHeight);
    }

    // Add overscan buffer
    start = Math.max(0, start - overscan);

    // Find end index
    let end = start;
    let visibleHeight = 0;

    if (dynamicHeight) {
      for (let i = start; i < items.length; i++) {
        const itemH = itemHeights.current[i] || estimatedItemHeight;
        visibleHeight += itemH;
        end = i;
        if (visibleHeight > containerHeight + overscan * estimatedItemHeight) {
          break;
        }
      }
    } else {
      end = Math.min(
        items.length - 1,
        start + Math.ceil(containerHeight / estimatedItemHeight) + overscan * 2
      );
    }

    return {
      visibleRange: { start, end: end + 1 },
      startIndex: start,
      endIndex: end + 1,
    };
  }, [
    scrollTop,
    items.length,
    estimatedItemHeight,
    overscan,
    height,
    dynamicHeight,
  ]);

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const newScrollTop = target.scrollTop;
      setScrollTop(newScrollTop);

      // Update scrolling state
      setIsScrolling(true);
      if (scrollingTimeout.current) {
        clearTimeout(scrollingTimeout.current);
      }
      scrollingTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);

      // Call onScroll callback
      if (onScroll) {
        onScroll(newScrollTop);
      }

      // Trigger load more if near bottom
      if (onLoadMore) {
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;
        if (scrollHeight - newScrollTop - clientHeight < loadThreshold) {
          onLoadMore();
        }
      }
    },
    [onScroll, onLoadMore, loadThreshold]
  );

  // Measure item height for dynamic sizing
  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (dynamicHeight && element) {
      const height = element.offsetHeight;
      if (height !== itemHeights.current[index]) {
        itemHeights.current[index] = height;
        // Trigger re-render by updating state
        setScrollTop((prev) => prev);
      }
    }
  }, [dynamicHeight]);

  // Scroll to index
  useEffect(() => {
    if (scrollToIndex !== undefined && containerRef.current) {
      let scrollTop = 0;

      if (dynamicHeight) {
        // Calculate scroll position based on measured heights
        for (let i = 0; i < scrollToIndex; i++) {
          scrollTop += itemHeights.current[i] || estimatedItemHeight;
        }
      } else {
        scrollTop = scrollToIndex * estimatedItemHeight;
      }

      // Adjust for scroll alignment
      const containerHeight =
        typeof height === "number" ? height : parseInt(height) || 600;
      const itemHeight = itemHeights.current[scrollToIndex] || estimatedItemHeight;

      switch (scrollAlignment) {
        case "center":
          scrollTop -= containerHeight / 2 - itemHeight / 2;
          break;
        case "end":
          scrollTop -= containerHeight - itemHeight;
          break;
        case "nearest":
          const currentScrollTop = containerRef.current.scrollTop;
          if (scrollTop < currentScrollTop) {
            // Item is above viewport
          } else if (scrollTop + itemHeight > currentScrollTop + containerHeight) {
            // Item is below viewport
            scrollTop -= containerHeight - itemHeight;
          } else {
            // Item is already visible
            return;
          }
          break;
      }

      containerRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, [scrollToIndex, scrollAlignment, estimatedItemHeight, height, dynamicHeight]);

  // Calculate offset for start item
  const getOffset = useCallback(
    (index: number) => {
      if (dynamicHeight) {
        let offset = 0;
        for (let i = 0; i < index; i++) {
          offset += itemHeights.current[i] || estimatedItemHeight;
        }
        return offset;
      }
      return index * estimatedItemHeight;
    },
    [estimatedItemHeight, dynamicHeight]
  );

  const containerStyle: React.CSSProperties = {
    height: typeof height === "number" ? `${height}px` : height,
    overflow: "auto",
    position: "relative",
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      style={containerStyle}
      onScroll={handleScroll}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Visible items */}
        {items.slice(startIndex, endIndex).map((item, index) => {
          const actualIndex = startIndex + index;
          const key = getKey(item, actualIndex);
          const offset = getOffset(actualIndex);

          return (
            <div
              key={key}
              ref={(el) => measureItem(actualIndex, el)}
              style={{
                position: "absolute",
                top: offset,
                left: 0,
                right: 0,
                // Don't set height here - let it be natural
              }}
              data-index={actualIndex}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.9)",
          }}
        >
          {loadingComponent || (
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to access virtual list methods imperatively
 *
 * @example
 * ```tsx
 * const virtualListRef = useVirtualListRef();
 *
 * <VirtualList ref={virtualListRef} ... />
 *
 * // Later
 * virtualListRef.current?.scrollToItem(10);
 * ```
 */
export interface VirtualListRef {
  scrollToItem: (index: number, alignment?: "start" | "center" | "end" | "nearest") => void;
  getScrollTop: () => number;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function useVirtualListRef(): React.RefObject<VirtualListRef> {
  return useRef<VirtualListRef>(null);
}

export default VirtualList;
