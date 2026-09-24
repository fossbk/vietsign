"use client";

import React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
} from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  className?: string;
  aspectRatio?: string;
  height?: string;
}

export function VideoPlayer({
  videoUrl,
  title,
  autoPlay = true,
  loop = true,
  showControls = true,
  className = "",
  aspectRatio = "16/9",
  height,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);
  const [isMuted, setIsMuted] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(false);

  // Format time display (mm:ss)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle video autoplay when component mounts or videoUrl changes
  React.useEffect(() => {
    const video = videoRef.current;
    if (video && videoUrl) {
      setMediaError(false);
      video.load();
      video.volume = volume;
      video.muted = isMuted;
      video.playbackRate = playbackSpeed;

      if (autoPlay) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }
    }
  }, [autoPlay, isMuted, playbackSpeed, videoUrl, volume]);

  // Update progress bar as video plays
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(clickPosition * 100);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const speedOptions = [
    { label: "Rất nhanh", value: 2 },
    { label: "Nhanh", value: 1.5 },
    { label: "Bình thường", value: 1 },
    { label: "Chậm", value: 0.5 },
  ];

  const containerStyle = height ? { height } : { aspectRatio };

  const isImage = React.useMemo(() => {
    return videoUrl?.match(/\.(webp|png|jpg|jpeg|gif|svg)(?:\?.*)?$/i);
  }, [videoUrl]);

  const youtubeId = React.useMemo(() => {
    if (!videoUrl) return null;
    const match = videoUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    );
    return match?.[1] || null;
  }, [videoUrl]);

  const isDirectVideo = React.useMemo(
    () => /^(blob:|data:video\/)/i.test(videoUrl || "") || /\.(mp4|webm|ogg|mov|m4v)(?:\?.*)?$/i.test(videoUrl || ""),
    [videoUrl],
  );

  if (youtubeId) {
    const query = new URLSearchParams({
      autoplay: autoPlay ? "1" : "0",
      controls: showControls ? "1" : "0",
      mute: "1",
      playsinline: "1",
      rel: "0",
    });
    if (loop) {
      query.set("loop", "1");
      query.set("playlist", youtubeId);
    }

    return (
      <div
        className={`bg-gray-900 relative overflow-hidden rounded-2xl ${className}`}
        style={containerStyle}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?${query.toString()}`}
          title={title || "Video ký hiệu"}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div
        className={`bg-gray-900 relative group overflow-hidden rounded-2xl flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <img
          src={videoUrl}
          alt={title || "Minh họa"}
          className="w-full h-full object-contain"
        />
        {title && (
          <div className="absolute top-3 right-3 z-10 bg-teal-600/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            <span className="text-white font-bold text-sm">{title}</span>
          </div>
        )}
      </div>
    );
  }

  if (videoUrl && !isDirectVideo) {
    return (
      <div
        className={`bg-gray-900 text-white relative overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-3 p-5 text-center ${className}`}
        style={containerStyle}
      >
        <p className="font-bold">Nguồn này là trang tra cứu, không phải tệp video trực tiếp.</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 font-bold"
        >
          Mở nguồn ký hiệu
        </a>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-900 relative group overflow-hidden rounded-2xl ${className}`}
      style={containerStyle}
    >
      {videoUrl && !mediaError ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover cursor-pointer"
            controls={false}
            muted
            loop={loop}
            playsInline
            onClick={togglePlay}
            onError={() => setMediaError(true)}
          >
            <source
              src={videoUrl}
              type={videoUrl.match(/\.webm(?:\?.*)?$/i) || videoUrl.startsWith("blob:") ? "video/webm" : "video/mp4"}
            />
            Trình duyệt của bạn không hỗ trợ video.
          </video>

          {/* Title overlay */}
          {title && (
            <div className="absolute top-3 right-3 z-10 bg-teal-600/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <span className="text-white font-bold text-sm">{title}</span>
            </div>
          )}

          {/* Logo overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">👋</span>
            </div>
            <span className="text-white/80 font-bold text-xs tracking-wider">
              QIPEDC
            </span>
          </div>

          {/* Play Overlay */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer transition-opacity duration-500"
            >
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <Play
                    size={24}
                    className="text-primary-600 fill-current ml-0.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Video Controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium min-w-[36px]">
                    {formatTime(currentTime)}
                  </span>
                  <div
                    ref={progressRef}
                    onClick={handleProgressClick}
                    className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress hover:h-2 transition-all"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 relative transition-all"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform"></div>
                    </div>
                  </div>
                  <span className="text-white text-xs font-medium min-w-[36px]">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between text-white">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      title={isPlaying ? "Tạm dừng" : "Phát"}
                    >
                      {isPlaying ? (
                        <Pause size={16} className="fill-current" />
                      ) : (
                        <Play size={16} className="fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Restart */}
                    <button
                      onClick={handleRestart}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      title="Phát lại từ đầu"
                    >
                      <RotateCcw size={14} />
                    </button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-1.5 group/volume">
                      <button
                        onClick={toggleMute}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                      >
                        {isMuted ? (
                          <VolumeX size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-0 group-hover/volume:w-16 transition-all duration-300 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2">
                    {/* Speed Control */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors"
                        title="Tốc độ phát"
                      >
                        {playbackSpeed}x
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-white/10">
                          {speedOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleSpeedChange(option.value)}
                              className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-white/10 transition-colors whitespace-nowrap ${
                                playbackSpeed === option.value
                                  ? "text-primary-400 bg-white/5"
                                  : "text-white"
                              }`}
                            >
                              {option.label} ({option.value}x)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen */}
                    <button
                      onClick={handleFullscreen}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      title="Phóng to"
                    >
                      <Maximize size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium p-4 text-center">
          <div className="text-center">
            <p>{mediaError ? "Không tải được video minh họa" : "Không có video hoặc hình ảnh minh họa"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
