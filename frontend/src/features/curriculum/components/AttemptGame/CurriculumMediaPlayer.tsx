"use client";
import React,{useEffect,useId,useRef,useState} from 'react';
import Image from 'next/image';

interface YTPlayer {playVideo():void;pauseVideo():void;seekTo(n:number,allow:boolean):void;setPlaybackRate(n:number):void;getAvailablePlaybackRates():number[];mute():void;destroy():void}
declare global {interface Window {YT?:{Player:new(element:HTMLElement,options:Record<string,unknown>)=>YTPlayer};onYouTubeIframeAPIReady?:()=>void}}
let youtubeReady:Promise<void>|null=null;
function loadYouTube(){
 if(window.YT?.Player)return Promise.resolve();
 if(!youtubeReady)youtubeReady=new Promise<void>((resolve,reject)=>{
  const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();resolve();};
  let script=document.querySelector<HTMLScriptElement>('script[data-vietsign-youtube]');
  if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.dataset.vietsignYoutube='true';document.head.append(script);}
  script.addEventListener('error',()=>{youtubeReady=null;script?.remove();reject(new Error('Không tải được trình phát YouTube'));},{once:true});
 });
 return youtubeReady;
}
interface Props {videoUrl:string;title?:string;autoPlay?:boolean;loop?:boolean;showControls?:boolean;className?:string;aspectRatio?:string;height?:string;playbackRate?:number;replayToken?:number;provider?:'file'|'youtube'|'lookup'}
export function CurriculumMediaPlayer({videoUrl,title,autoPlay=true,loop=true,showControls=true,className='',aspectRatio='16/9',height,playbackRate=1,replayToken=0,provider}:Props){
 const id=useId(),video=useRef<HTMLVideoElement>(null),host=useRef<HTMLDivElement>(null),youtube=useRef<YTPlayer|null>(null);
 const [error,setError]=useState(''),[speed,setSpeed]=useState(playbackRate),[ready,setReady]=useState(false),[supported,setSupported]=useState<number[]>([0.5,1,1.5,2]);
 const youtubeId=videoUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1];
 const image=/\.(webp|png|jpe?g|gif|svg)(?:\?.*)?$/i.test(videoUrl||'');
 const lookup=provider==='lookup'||/\/dictionary(?:[/?#]|$)/i.test(videoUrl||'');
 const speedRef=useRef(playbackRate);speedRef.current=speed;
 const claim=()=>window.dispatchEvent(new CustomEvent('vietsign:media-active',{detail:id}));
 useEffect(()=>{
  const pause=(event:Event)=>{if((event as CustomEvent<string>).detail!==id){video.current?.pause();youtube.current?.pauseVideo();}};
  window.addEventListener('vietsign:media-active',pause);
  return()=>window.removeEventListener('vietsign:media-active',pause);
 },[id]);
 useEffect(()=>{
  if(!youtubeId)return;let active=true;const target=host.current;if(!target)return;
  setReady(false);setError('');
  loadYouTube().then(()=>{
   if(!active||!window.YT)return;const inner=document.createElement('div');target.replaceChildren(inner);
   const player=new window.YT.Player(inner,{host:'https://www.youtube-nocookie.com',videoId:youtubeId,playerVars:{autoplay:autoPlay?1:0,controls:showControls?1:0,mute:1,playsinline:1,rel:0,origin:window.location.origin,loop:loop?1:0,playlist:loop?youtubeId:undefined},events:{
    onReady:()=>{if(!active)return;youtube.current=player;player.mute();const rates=player.getAvailablePlaybackRates();setSupported(rates.length?rates:[1]);player.setPlaybackRate(speedRef.current);setReady(true);if(autoPlay){claim();player.playVideo();}},
    onStateChange:(event:{data:number})=>{if(active&&event.data===1)claim();},
    onError:()=>{if(active)setError('Video YouTube chưa phát được. Kiểm tra quyền nhúng hoặc thử lại.');}
   }});youtube.current=player;
  }).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;youtube.current?.destroy();youtube.current=null;target.replaceChildren();};
 // Only source/provider changes recreate the external player; speed/volume never reload media.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[youtubeId,autoPlay,loop,showControls]);
 useEffect(()=>{setSpeed(playbackRate);speedRef.current=playbackRate;if(video.current)video.current.playbackRate=playbackRate;youtube.current?.setPlaybackRate(playbackRate);},[playbackRate]);
 useEffect(()=>{const current=video.current;return()=>{current?.pause();};},[videoUrl]);
 const replay=()=>{if(video.current){video.current.currentTime=0;void video.current.play().catch(()=>setError('Hãy chạm nút phát để xem video.'));}if(youtube.current){claim();youtube.current.seekTo(0,true);youtube.current.playVideo();}};
 useEffect(()=>{if(replayToken>0)replay();},[replayToken]); // eslint-disable-line react-hooks/exhaustive-deps
 if(lookup)return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p>Nguồn này là trang tra cứu, chưa có video phát trực tiếp.</p><a href={videoUrl} target="_blank" rel="noreferrer" className="underline">Mở nguồn ký hiệu</a></div>;
 if(image)return <div className={`flex items-center justify-center rounded-xl bg-white ${className}`} style={{height,aspectRatio:height?undefined:aspectRatio}}><Image unoptimized width={640} height={480} src={videoUrl} alt={title||'Minh họa'} className="h-full w-full object-contain"/></div>;
 if(!videoUrl)return <p role="status" className="rounded-xl bg-amber-50 p-4">Chưa có video mẫu.</p>;
 return <div className={`overflow-hidden rounded-2xl bg-gray-900 text-white ${className}`}>
  <div style={{height,aspectRatio:height?undefined:aspectRatio,minHeight:youtubeId?200:undefined}}>
   {youtubeId?<div ref={host} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full"/>:<video key={videoUrl} ref={video} src={videoUrl} title={title} className="h-full w-full object-contain" autoPlay={autoPlay} muted playsInline loop={loop} controls={showControls} onPlay={claim} onLoadedMetadata={()=>{if(video.current)video.current.playbackRate=speedRef.current;setReady(true);setError('');}} onError={()=>setError('Không tải được video mẫu. Hãy kiểm tra học liệu.')}/>}
  </div>
  {error&&<p role="alert" className="p-3 text-sm text-amber-100">{error}</p>}
  {showControls&&<div className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
   <button type="button" disabled={!!youtubeId&&!ready} onClick={replay} className="min-h-11 rounded-lg border border-white/50 px-3 focus-visible:outline-2">↻ Xem lại</button>
   <label className="flex items-center gap-2">Tốc độ phát<select aria-label="Tốc độ phát" value={speed} onChange={e=>{const rate=Number(e.target.value);setSpeed(rate);if(video.current)video.current.playbackRate=rate;youtube.current?.setPlaybackRate(rate);}} className="min-h-11 rounded-lg bg-gray-800 p-2">{[0.5,1,1.5,2].map(n=><option disabled={!!youtubeId&&!supported.includes(n)} key={n} value={n}>{n}×</option>)}</select></label>
   {youtubeId&&ready&&!supported.includes(0.5)&&<span>Video này chưa hỗ trợ 0.5×.</span>}
  </div>}
 </div>;
}
