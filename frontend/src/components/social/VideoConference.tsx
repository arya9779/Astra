'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Users, 
  Settings,
  Monitor
} from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  avatarUrl?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isHost: boolean;
}

interface VideoConferenceProps {
  boardId: string;
  boardName: string;
}

export function VideoConference({ boardId, boardName }: VideoConferenceProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Simulate participants for demo
  useEffect(() => {
    if (isInCall) {
      setParticipants([
        {
          id: 'current-user',
          username: 'You',
          isVideoEnabled: isVideoEnabled,
          isAudioEnabled: isAudioEnabled,
          isHost: true,
        },
        {
          id: 'user-2',
          username: 'Alice Johnson',
          isVideoEnabled: true,
          isAudioEnabled: true,
          isHost: false,
        },
        {
          id: 'user-3',
          username: 'Bob Smith',
          isVideoEnabled: false,
          isAudioEnabled: true,
          isHost: false,
        },
      ]);
    } else {
      setParticipants([]);
    }
  }, [isInCall, isVideoEnabled, isAudioEnabled]);

  const joinCall = () => {
    setIsInCall(true);
  };

  const leaveCall = () => {
    setIsInCall(false);
    setIsScreenSharing(false);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  if (!isInCall) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Video Conference - {boardName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ready to join the meeting?</h3>
          <p className="text-muted-foreground mb-6">
            Connect with your team members through secure video conferencing.
          </p>
          <Button onClick={joinCall} size="lg">
            <Video className="h-4 w-4 mr-2" />
            Join Video Call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main video area */}
      <Card className="relative">
        <CardContent className="p-0">
          <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
            {isScreenSharing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Monitor className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg">Screen sharing active</p>
                  <p className="text-sm opacity-75">Sharing your screen with participants</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 p-4 h-full">
                {participants.slice(0, 4).map((participant) => (
                  <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                    {participant.isVideoEnabled ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={participant.avatarUrl} />
                          <AvatarFallback className="text-2xl">
                            {participant.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <VideoOff className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Camera off</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Participant info */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {participant.username}
                          {participant.isHost && ' (Host)'}
                        </Badge>
                        <div className="flex space-x-1">
                          {!participant.isAudioEnabled && (
                            <MicOff className="h-3 w-3 text-red-400" />
                          )}
                          {!participant.isVideoEnabled && (
                            <VideoOff className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "secondary" : "outline"}
              size="lg"
              onClick={toggleScreenShare}
            >
              <Monitor className="h-5 w-5" />
            </Button>
            
            <Button variant="outline" size="lg">
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button variant="destructive" size="lg" onClick={leaveCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participants list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Participants ({participants.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.avatarUrl} />
                    <AvatarFallback>
                      {participant.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{participant.username}</span>
                  {participant.isHost && (
                    <Badge variant="secondary">Host</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  {participant.isAudioEnabled ? (
                    <Mic className="h-4 w-4 text-green-600" />
                  ) : (
                    <MicOff className="h-4 w-4 text-red-600" />
                  )}
                  {participant.isVideoEnabled ? (
                    <Video className="h-4 w-4 text-green-600" />
                  ) : (
                    <VideoOff className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}