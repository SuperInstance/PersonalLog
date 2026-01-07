/**
 * Agent Marketplace Page
 *
 * Main marketplace page for browsing, discovering, and installing agents.
 * Features hero section, search, filtering, and agent gallery.
 */

'use client';

import { useState, useMemo } from 'react';
import { Package, TrendingUp, Sparkles } from 'lucide-react';
import type { MarketplaceAgent, AgentCategory } from '@/lib/marketplace/types';
import { mockMarketplaceAgents } from '@/lib/marketplace/mock-data';
import { importAgentFromFile, downloadAgentFile, downloadMultipleAgents } from '@/lib/marketplace';
import { ExportFormat } from '@/lib/marketplace/types';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { CategoryNav } from '@/components/marketplace/CategoryNav';
import { AgentGallery } from '@/components/marketplace/AgentGallery';
import { AgentDetailModal } from '@/components/marketplace/AgentDetailModal';
import { ImportExport } from '@/components/marketplace/ImportExport';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, Tab, TabsPanel } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const [agents, setAgents] = useState<MarketplaceAgent[]>(mockMarketplaceAgents);
  const [activeTab, setActiveTab] = useState<'browse' | 'import-export'>('browse');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<AgentCategory | 'all', number>> = {
      all: agents.length,
    };

    agents.forEach((agent) => {
      counts[agent.category] = (counts[agent.category] || 0) + 1;
    });

    return counts;
  }, [agents]);

  // Get featured agents
  const featuredAgents = useMemo(() => {
    return agents.filter((agent) => agent.marketplace.stats.featured);
  }, [agents]);

  // Handle view details
  const handleViewDetails = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
    }
  };

  // Handle install
  const handleInstall = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              marketplace: {
                ...agent.marketplace,
                installation: {
                  installed: true,
                  installedVersion: agent.marketplace.version,
                  installedAt: new Date().toISOString(),
                },
                stats: {
                  ...agent.marketplace.stats,
                  installs: agent.marketplace.stats.installs + 1,
                },
              },
            }
          : agent
      )
    );

    // Update selected agent if modal is open
    if (selectedAgent?.id === agentId) {
      const updatedAgent = agents.find((a) => a.id === agentId);
      if (updatedAgent) {
        setSelectedAgent({
          ...updatedAgent,
          marketplace: {
            ...updatedAgent.marketplace,
            installation: {
              installed: true,
              installedVersion: updatedAgent.marketplace.version,
              installedAt: new Date().toISOString(),
            },
            stats: {
              ...updatedAgent.marketplace.stats,
              installs: updatedAgent.marketplace.stats.installs + 1,
            },
          },
        });
      }
    }
  };

  // Handle uninstall
  const handleUninstall = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              marketplace: {
                ...agent.marketplace,
                installation: {
                  installed: false,
                },
                stats: {
                  ...agent.marketplace.stats,
                  installs: Math.max(0, agent.marketplace.stats.installs - 1),
                },
              },
            }
          : agent
      )
    );

    // Close modal if open
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null);
    }
  };

  // Handle rating
  const handleRate = async (agentId: string, rating: number, review?: string) => {
    try {
      const { rateAgent } = await import('@/lib/marketplace/ratings');

      // In production, get actual user ID
      const userId = 'user-' + Math.random().toString(36).substring(7);

      await rateAgent(agentId, userId, rating, review);

      // Update agent stats in state
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                marketplace: {
                  ...agent.marketplace,
                  stats: {
                    ...agent.marketplace.stats,
                    ratingCount: agent.marketplace.stats.ratingCount + 1,
                  },
                },
              }
            : agent
        )
      );

      // Show success message
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit rating:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit review');
    }
  };

  // Handle search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    // Add to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev].slice(0, 5));
    }
  };

  // Handle import
  const handleImport = async (files: File[]) => {
    const importResults: Array<{ file: string; success: boolean; message: string }> = [];

    for (const file of files) {
      try {
        const result = await importAgentFromFile(file);

        if (result.imported) {
          // Import successful - add to agents list
          importResults.push({
            file: file.name,
            success: true,
            message: `Successfully imported agent: ${result.agentId}`,
          });

          // Reload agents from storage to get the newly imported agent
          // In production, this would trigger a re-fetch from IndexedDB
          // For now, we'll just show the success message
        } else if (result.skipped) {
          importResults.push({
            file: file.name,
            success: false,
            message: 'Agent already exists (skipped)',
          });
        } else if (result.error) {
          importResults.push({
            file: file.name,
            success: false,
            message: result.error,
          });
        }
      } catch (error) {
        importResults.push({
          file: file.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Show summary
    const successful = importResults.filter((r) => r.success).length;
    const failed = importResults.length - successful;

    if (failed > 0) {
      throw new Error(
        `Import completed with ${successful} successful and ${failed} failed. Check logs for details.`
      );
    }
  };

  // Handle export
  const handleExport = async (format: 'json' | 'yaml', agentIds: string[]) => {
    const exportFormat = format === 'json' ? ExportFormat.JSON : ExportFormat.YAML;

    // Find agents to export
    const agentsToExport = agents.filter((agent) => agentIds.includes(agent.id));

    if (agentsToExport.length === 0) {
      throw new Error('No agents found to export');
    }

    // Export all selected agents as a single file
    await downloadMultipleAgents(agentsToExport, exportFormat, `personallog-agents-${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Package className="w-8 h-8" />
              <h1 className="text-4xl font-bold">Agent Marketplace</h1>
            </div>

            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Discover and install AI agents created by the community to supercharge your conversations
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <SearchBar
                query={searchQuery}
                onQueryChange={handleSearchChange}
                placeholder="Search for agents..."
                recentSearches={recentSearches}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg"
              />
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{agents.length}</div>
                <div className="text-sm text-blue-100">Agents</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold">
                  {agents.reduce((sum, a) => sum + a.marketplace.stats.downloads, 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-100">Downloads</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold">
                  {agents.reduce((sum, a) => sum + a.marketplace.stats.installs, 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-100">Active Installs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <Tab value="browse">Browse Agents</Tab>
            <Tab value="import-export">Import / Export</Tab>
          </TabsList>

          <TabsPanel value="browse">
            {/* Category Navigation */}
            <div className="mb-6">
              <CategoryNav
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                categoryCounts={categoryCounts}
              />
            </div>

            {/* Featured Section */}
            {selectedCategory === 'all' && !searchQuery && featuredAgents.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Featured Agents
                  </h2>
                </div>

                <AgentGallery
                  agents={featuredAgents}
                  onInstall={handleInstall}
                  onViewDetails={handleViewDetails}
                  category={selectedCategory}
                  searchQuery={searchQuery}
                />
              </section>
            )}

            {/* All Agents Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedCategory === 'all' ? 'All Agents' : `${selectedCategory} Agents`}
                </h2>

                {searchQuery && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    matching &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              <AgentGallery
                agents={agents}
                onInstall={handleInstall}
                onViewDetails={handleViewDetails}
                category={selectedCategory}
                searchQuery={searchQuery}
              />
            </section>
          </TabsPanel>

          <TabsPanel value="import-export">
            <ImportExport
              onImport={handleImport}
              onExport={handleExport}
              availableAgents={agents.map((a) => ({ id: a.id, name: a.name, icon: a.icon }))}
            />
          </TabsPanel>
        </Tabs>
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onRate={handleRate}
        />
      )}
    </div>
  );
}
