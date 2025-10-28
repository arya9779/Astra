'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Users, Shield, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Board {
  id: string;
  name: string;
  description?: string;
  type: string;
  isEncrypted: boolean;
  memberCount: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface CreateBoardForm {
  name: string;
  description: string;
  type: 'PROFESSIONAL' | 'WHISTLEBLOWER' | 'COMMUNITY';
  isEncrypted: boolean;
}

export function BoardManager() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBoardForm>({
    name: '',
    description: '',
    type: 'PROFESSIONAL',
    isEncrypted: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const response = await api.get('/social/me/boards');
      setBoards(response.data);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Board name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await api.post('/social/boards', createForm);
      setBoards(prev => [response.data, ...prev]);
      setCreateDialogOpen(false);
      setCreateForm({
        name: '',
        description: '',
        type: 'PROFESSIONAL',
        isEncrypted: false,
      });
      
      toast({
        title: 'Board created',
        description: 'Your board has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create board',
        variant: 'destructive',
      });
    }
  };

  const getBoardIcon = (type: string) => {
    switch (type) {
      case 'PROFESSIONAL':
        return <Users className="h-5 w-5" />;
      case 'WHISTLEBLOWER':
        return <Shield className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getBoardTypeColor = (type: string) => {
    switch (type) {
      case 'PROFESSIONAL':
        return 'bg-blue-100 text-blue-800';
      case 'WHISTLEBLOWER':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading boards...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Boards</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Board Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter board name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your board"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Board Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="WHISTLEBLOWER">Whistleblower</SelectItem>
                    <SelectItem value="COMMUNITY">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="encrypted"
                  checked={createForm.isEncrypted}
                  onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, isEncrypted: checked }))}
                />
                <Label htmlFor="encrypted">Enable end-to-end encryption</Label>
              </div>
              
              <Button onClick={createBoard} className="w-full">
                Create Board
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {boards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first board to start collaborating with others.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card key={board.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getBoardIcon(board.type)}
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                  </div>
                  {board.isEncrypted && (
                    <Shield className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {board.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getBoardTypeColor(board.type)}>
                      {board.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {board.memberCount} members
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={board.owner.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {board.owner.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      by {board.owner.username}
                    </span>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Open Board
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}