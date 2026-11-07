'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  AlertCircle,
  Activity,
  FileText,
  Eye
} from 'lucide-react';

interface Stats {
  totalPosts: number;
  analyzedPosts: number;
  unanalyzedPosts: number;
  priorityCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  reviewCounts: Record<string, number>;
  dateRange: {
    earliest: number | null;
    latest: number | null;
  };
  missingDates: number;
}

interface Post {
  id: string;
  platform: string;
  record_type: string;
  text: string;
  timestamp: number | null;
  analysis_priority: string | null;
  priority_score: number | null;
  review_status: string | null;
}

interface Health {
  database: boolean;
  ollama: boolean;
  model: string;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('facebook');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadPosts();
    checkHealth();
  }, [filterPriority]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.set('priority', filterPriority);
      params.set('limit', '50');
      
      const response = await fetch(`/api/posts?${params}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to check health:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('platform', selectedPlatform);

      const response = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Import completed! Processed: ${result.processed}, Failed: ${result.failed}`);
        setSelectedFile(null);
        loadStats();
        loadPosts();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!stats || stats.unanalyzedPosts === 0) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/posts?limit=50');
      const data = await response.json();
      const unanalyzedPosts = data.posts.filter((p: Post) => !p.analysis_priority);
      
      if (unanalyzedPosts.length === 0) {
        alert('No posts to analyze');
        return;
      }

      const postIds = unanalyzedPosts.slice(0, 10).map((p: Post) => p.id);
      
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds, batchSize: 10 }),
      });

      if (analyzeResponse.ok) {
        const result = await analyzeResponse.json();
        alert(`Analysis completed! Analyzed: ${result.analyzed}, Failed: ${result.failed}`);
        loadStats();
        loadPosts();
      } else {
        const error = await analyzeResponse.json();
        alert(`Analysis failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">floppy-disk</h1>
          <p className="text-muted-foreground">
            Privacy-first social media reputation review for your job search
          </p>
        </div>

        {health && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Database: Online</span>
                </div>
                <div className="flex items-center gap-2">
                  {health.ollama ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span>Ollama: {health.ollama ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>Model: {health.model}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{stats.totalPosts}</CardTitle>
                <CardDescription>Total Posts</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{stats.analyzedPosts}</CardTitle>
                <CardDescription>Analyzed</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-orange-600">
                  {stats.priorityCounts.high || 0}
                </CardTitle>
                <CardDescription>High Priority</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-blue-600">
                  {stats.priorityCounts.medium || 0}
                </CardTitle>
                <CardDescription>Medium Priority</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Social Media Archive
            </CardTitle>
            <CardDescription>
              Upload your data export from Facebook or X/Twitter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedPlatform === 'facebook' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('facebook')}
                  size="sm"
                >
                  Facebook
                </Button>
                <Button
                  variant={selectedPlatform === 'twitter' ? 'default' : 'outline'}
                  onClick={() => setSelectedPlatform('twitter')}
                  size="sm"
                >
                  X/Twitter
                </Button>
              </div>
              <div className="flex gap-4">
                <Input
                  type="file"
                  accept={selectedPlatform === 'facebook' ? '.json,.html,.htm,.zip' : '.json,.js,.zip'}
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPlatform === 'facebook' 
                  ? 'Accepts JSON, HTML, or ZIP exports from Facebook'
                  : 'Accepts ZIP archives or tweets.js files from X/Twitter'}
              </p>
            </div>
          </CardContent>
        </Card>

        {stats && stats.unanalyzedPosts > 0 && health?.ollama && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Analysis Pending
              </CardTitle>
              <CardDescription>
                {stats.unanalyzedPosts} posts waiting for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : 'Start Analysis'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Posts for Review
            </CardTitle>
            <CardDescription>
              {posts.length} posts shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={filterPriority === null ? 'default' : 'outline'}
                  onClick={() => setFilterPriority(null)}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filterPriority === 'high' ? 'default' : 'outline'}
                  onClick={() => setFilterPriority('high')}
                  size="sm"
                >
                  High Priority
                </Button>
                <Button
                  variant={filterPriority === 'medium' ? 'default' : 'outline'}
                  onClick={() => setFilterPriority('medium')}
                  size="sm"
                >
                  Medium Priority
                </Button>
                <Button
                  variant={filterPriority === 'low' ? 'default' : 'outline'}
                  onClick={() => setFilterPriority('low')}
                  size="sm"
                >
                  Low Priority
                </Button>
              </div>

              <div className="space-y-3">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{post.platform}</Badge>
                            <Badge variant="outline">{post.record_type}</Badge>
                            {post.analysis_priority && (
                              <Badge variant={getPriorityColor(post.analysis_priority)}>
                                {post.analysis_priority}
                              </Badge>
                            )}
                            {post.review_status && (
                              <Badge variant="secondary">{post.review_status}</Badge>
                            )}
                          </div>
                          <p className="text-sm mb-2">
                            {post.text?.substring(0, 200)}
                            {post.text && post.text.length > 200 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(post.timestamp)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {posts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No posts to display. Import your Facebook archive to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
