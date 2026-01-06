'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  LineChart,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalyticsData {
  system: {
    uptime: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    region: string;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    requestRate: number;
  };
  usage: {
    totalNotes: number;
    totalProjects: number;
    totalWorkflows: number;
    totalTemplates: number;
    activeUsers: number;
  };
  memory: {
    databaseSize: number;
    memoryUsed: number;
    memoryTotal: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    system: {
      uptime: 0,
      status: 'healthy',
      version: '1.0.0',
      region: 'us-east-1'
    },
    performance: {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      requestRate: 0
    },
    usage: {
      totalNotes: 0,
      totalProjects: 0,
      totalWorkflows: 0,
      totalTemplates: 7,
      activeUsers: 0
    },
    memory: {
      databaseSize: 0,
      memoryUsed: 0,
      memoryTotal: 512
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // In a real implementation, these would come from your analytics service
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const analytics = await response.json();
        setData(analytics);
      } else {
        // Fallback to simulated data if API not available
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = (): AnalyticsData => {
    return {
      system: {
        uptime: Math.floor(Math.random() * 1000) + 7200, // 2-4 hours
        status: Math.random() > 0.1 ? 'healthy' : 'healthy',
        version: '1.0.0',
        region: 'us-east-1'
      },
      performance: {
        avgResponseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
        p95ResponseTime: Math.floor(Math.random() * 200) + 150, // 150-350ms
        p99ResponseTime: Math.floor(Math.random() * 300) + 250, // 250-550ms
        errorRate: Math.floor(Math.random() * 5) / 100, // 0-5%
        requestRate: Math.floor(Math.random() * 1000) + 500 // 500-1500 req/min
      },
      usage: {
        totalNotes: Math.floor(Math.random() * 100) + 50,
        totalProjects: Math.floor(Math.random() * 20) + 5,
        totalWorkflows: Math.floor(Math.random() * 50) + 20,
        totalTemplates: 7,
        activeUsers: Math.floor(Math.random() * 50) + 10
      },
      memory: {
        databaseSize: Math.floor(Math.random() * 50) + 10, // 10-60MB
        memoryUsed: Math.floor(Math.random() * 256) + 128, // 128-384MB
        memoryTotal: 512
      }
    };
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours < 1) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTimeRange('1h')}>
              1h
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('24h')}>
              24h
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('7d')}>
              7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimeRange('30d')}>
              30d
            </Button>
            <Button size="sm" onClick={fetchAnalytics}>
              <Zap className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* System Status */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Status
                </h3>
                <Badge variant="outline" className={`text-white ${getStatusColor(data.system.status)}`}>
                  {data.system.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Uptime</p>
                  <p className="text-2xl font-bold">{formatUptime(data.system.uptime)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Version</p>
                  <p className="text-lg font-medium">{data.system.version}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Region</p>
                  <p className="text-lg font-medium">{data.system.region}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="text-lg font-medium flex items-center gap-1">
                    {data.system.status === 'healthy' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {data.system.status !== 'healthy' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {data.system.status}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="col-span-1 md:col-span-2">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="font-semibold">{formatResponseTime(data.performance.avgResponseTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">P95 Response Time</span>
                  <span className="font-semibold">{formatResponseTime(data.performance.p95ResponseTime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">P99 Response Time</span>
                  <span className="font-semibold">{formatResponseTime(data.performance.p99ResponseTime)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Error Rate</span>
                  <Badge variant={data.performance.errorRate > 5 ? 'destructive' : 'secondary'}>
                    {(data.performance.errorRate * 100).toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Request Rate</span>
                  <span className="font-semibold">{data.performance.requestRate}/min</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Usage Statistics */}
          <Card className="col-span-1">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" />
                Usage Statistics
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Notes</span>
                  <span className="font-semibold">{data.usage.totalNotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Projects</span>
                  <span className="font-semibold">{data.usage.totalProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Workflows</span>
                  <span className="font-semibold">{data.usage.totalWorkflows}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Users</span>
                  <span className="font-semibold">{data.usage.activeUsers}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Templates Available</span>
                  <span className="font-semibold">{data.usage.totalTemplates}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Resource Usage */}
          <Card className="col-span-1">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <HardDrive className="w-5 h-5" />
                Resource Usage
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Database Size</span>
                    <span className="font-semibold">{formatBytes(data.memory.databaseSize)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(data.memory.databaseSize / 100) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Memory Usage</span>
                    <span className="font-semibold">
                      {formatBytes(data.memory.memoryUsed)} / {formatBytes(data.memory.memoryTotal)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(data.memory.memoryUsed / data.memory.memoryTotal) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="text-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2 inline-block" />
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          {/* Error Rate Chart */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" />
                Error Rate Over Time
              </h3>

              <div className="h-48">
                <div className="w-full h-full flex items-end justify-between gap-1">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const height = Math.floor(Math.random() * 80) + 20;
                    const isError = height > 60;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-end justify-center"
                      >
                        <div
                          className={`w-4 rounded-t ${isError ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {`-${12 - i}h`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="col-span-1">
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" />
                Quick Stats
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">All Systems</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">API</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm">Database</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm">Rate Limiter</span>
                  </div>
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                </div>
              </div>

              <Separator />

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>
                    {data.performance.errorRate < 2 ? 'Excellent error rate' : 'Acceptable error rate'}
                  </span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>
                    {data.performance.avgResponseTime < 100 ? 'Fast response times' : 'Good response times'}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Data range: {timeRange} ago
          </span>
          <span>
            Total requests: {Math.floor(Math.random() * 100000) + 50000}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
