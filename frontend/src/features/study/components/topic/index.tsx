"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Image as ImageIcon, RotateCcw, Trophy } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { message } from "antd";
import LearnModel from "@/domain/entities/Learn";

type Vocabulary = {
  id: number;
  word: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
};

type Tab = "vocabulary" | "quiz" | "memory";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function TopicLearning() {
  const params = useParams();
  const router = useRouter();
  const classroomId = Number(params.id);
  const topicId = Number(params.topicId);
  const [topic, setTopic] = useState<any>(null);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [learnedIds, setLearnedIds] = useState<number[]>([]);
  const [tab, setTab] = useState<Tab>("vocabulary");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [topicResponse, progressResponse] = await Promise.all([
          LearnModel.getTopicWithVocabularies(topicId),
          LearnModel.getVocabularyProgress(topicId),
        ]);
        const topicData = topicResponse?.data || topicResponse;
        const items = (topicData?.vocabularies || []).map((item: any) => ({
          id: Number(item.id || item.vocabulary_id),
          word: item.word || item.content || "",
          description: item.description || "",
          imageUrl: item.imageUrl || item.image_url,
          videoUrl: item.videoUrl || item.video_url,
        }));
        setTopic(topicData);
        setVocabularies(items);
        const progress = progressResponse?.data || progressResponse;
        setLearnedIds(
          (progress?.vocabularies || [])
            .filter((item: any) => item.isLearned)
            .map((item: any) => Number(item.vocabularyId)),
        );
      } catch (error) {
        console.error("Không thể tải chủ đề", error);
        message.error("Không thể tải nội dung chủ đề");
      } finally {
        setLoading(false);
      }
    };
    if (topicId) load();
  }, [topicId]);

  const markLearned = async (vocabularyId: number) => {
    if (learnedIds.includes(vocabularyId)) return;
    try {
      await LearnModel.markVocabularyLearned(vocabularyId);
      setLearnedIds((previous) => [...previous, vocabularyId]);
    } catch {
      message.error("Không thể lưu tiến độ học");
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-500">Đang tải chủ đề...</div>;
  if (!topic) return <div className="py-20 text-center text-gray-500">Không tìm thấy chủ đề</div>;

  const progress = vocabularies.length
    ? Math.round((learnedIds.length / vocabularies.length) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button onClick={() => router.push(`/study/${classroomId}`)} className="flex items-center gap-2 text-gray-500 hover:text-primary-600">
        <ArrowLeft size={20} /> Quay lại lớp học
      </button>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-primary-600 to-emerald-600 p-8 text-white">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/80">Chủ đề học tập</p>
              <h1 className="text-3xl font-bold">{topic.name}</h1>
              <p className="mt-2 max-w-2xl text-white/80">{topic.description || "Học từ vựng, làm câu hỏi và chơi lật thẻ."}</p>
            </div>
            <div className="min-w-48 rounded-xl bg-white/15 p-4">
              <div className="flex justify-between text-sm"><span>Tiến độ</span><b>{progress}%</b></div>
              <div className="mt-2 h-2 rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-xs text-white/80">{learnedIds.length}/{vocabularies.length} từ đã học</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap border-b border-gray-100">
          {([['vocabulary', 'Từ vựng'], ['quiz', 'Câu hỏi'], ['memory', 'Lật thẻ']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`px-6 py-4 text-sm font-semibold ${tab === value ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
      </section>

      {tab === "vocabulary" && <VocabularyPanel vocabularies={vocabularies} learnedIds={learnedIds} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} onLearn={markLearned} />}
      {tab === "quiz" && <QuizPanel topicId={topicId} vocabularies={vocabularies} />}
      {tab === "memory" && <MemoryPanel topicId={topicId} vocabularies={vocabularies} />}
    </div>
  );
}

function VocabularyPanel({ vocabularies, learnedIds, currentIndex, setCurrentIndex, onLearn }: any) {
  const current = vocabularies[currentIndex];
  if (!current) return <EmptyState text="Chủ đề chưa có từ vựng." />;
  return <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Học từ vựng</h2><span className="text-sm text-gray-500">Từ {currentIndex + 1}/{vocabularies.length}</span></div>
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex min-h-72 items-center justify-center rounded-xl bg-gray-50 p-4">
        {current.videoUrl ? <video src={current.videoUrl} controls className="max-h-72 w-full rounded-lg" /> : current.imageUrl ? <img src={current.imageUrl} alt={current.word} className="max-h-72 object-contain" /> : <ImageIcon size={64} className="text-gray-300" />}
      </div>
      <div className="flex flex-col justify-center"><p className="text-3xl font-bold text-primary-700">{current.word}</p><p className="mt-3 text-gray-600">{current.description || "Hãy quan sát ký hiệu và ghi nhớ từ này."}</p><button onClick={() => onLearn(current.id)} className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold ${learnedIds.includes(current.id) ? 'bg-green-100 text-green-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}><CheckCircle size={18} />{learnedIds.includes(current.id) ? "Đã học" : "Đánh dấu đã học"}</button></div>
    </div>
    <div className="mt-6 flex justify-between"><button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i: number) => i - 1)} className="rounded-lg bg-gray-100 px-4 py-2 disabled:opacity-40">Từ trước</button><button disabled={currentIndex === vocabularies.length - 1} onClick={() => setCurrentIndex((i: number) => i + 1)} className="rounded-lg bg-primary-50 px-4 py-2 text-primary-700 disabled:opacity-40">Từ tiếp theo</button></div>
  </section>;
}

function QuizPanel({ topicId, vocabularies }: { topicId: number; vocabularies: Vocabulary[] }) {
  const questions = useMemo(() => shuffle(vocabularies).slice(0, Math.min(10, vocabularies.length)).map((target) => ({ target, options: shuffle([target, ...shuffle(vocabularies.filter((v) => v.id !== target.id)).slice(0, 3)]) })), [vocabularies]);
  const [index, setIndex] = useState(0); const [correct, setCorrect] = useState(0); const [selected, setSelected] = useState<number | null>(null); const [done, setDone] = useState(false); const [saving, setSaving] = useState(false);
  const current = questions[index];
  const answer = (id: number) => { if (selected !== null) return; setSelected(id); if (id === current.target.id) setCorrect((v) => v + 1); };
  const next = async () => { if (index < questions.length - 1) { setIndex((v) => v + 1); setSelected(null); return; } const finalCorrect = correct + (selected === current.target.id ? 1 : 0); setSaving(true); try { await LearnModel.saveTopicQuizAttempt(topicId, { totalQuestions: questions.length, correctAnswers: finalCorrect, score: questions.length ? Math.round((finalCorrect / questions.length) * 100) : 0 }); setDone(true); } finally { setSaving(false); } };
  if (!questions.length) return <EmptyState text="Cần có từ vựng để tạo câu hỏi." />;
  if (done) return <Result title="Hoàn thành câu hỏi" score={questions.length ? Math.round((correct / questions.length) * 100) : 0} onRestart={() => { setIndex(0); setCorrect(0); setSelected(null); setDone(false); }} />;
  return <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">Câu hỏi tự sinh</h2><span className="text-gray-500">{index + 1}/{questions.length}</span></div><p className="mb-5 text-lg font-semibold">Từ nào phù hợp với {current.target.videoUrl ? "video" : "từ vựng này"}?</p>{current.target.videoUrl && <video src={current.target.videoUrl} controls className="mb-5 max-h-64 w-full rounded-xl bg-black" />}{current.target.imageUrl && !current.target.videoUrl && <img src={current.target.imageUrl} alt="" className="mb-5 max-h-56 w-full rounded-xl bg-gray-50 object-contain" />}
    <div className="grid gap-3 md:grid-cols-2">{current.options.map((option) => <button key={option.id} onClick={() => answer(option.id)} className={`rounded-xl border-2 p-4 text-left font-semibold ${selected === null ? 'border-gray-100 hover:border-primary-300' : option.id === current.target.id ? 'border-green-500 bg-green-50 text-green-700' : selected === option.id ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-400'}`}>{option.word}</button>)}</div><button disabled={selected === null || saving} onClick={next} className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{index === questions.length - 1 ? 'Nộp bài' : 'Câu tiếp theo'}</button></section>;
}

function MemoryPanel({ topicId, vocabularies }: { topicId: number; vocabularies: Vocabulary[] }) {
  const playable = useMemo(() => shuffle(vocabularies.filter((v) => v.videoUrl || v.imageUrl)).slice(0, 6), [vocabularies]);
  const [cards, setCards] = useState<any[]>([]); const [flipped, setFlipped] = useState<number[]>([]); const [matched, setMatched] = useState<number[]>([]); const [moves, setMoves] = useState(0); const [startedAt] = useState(Date.now()); const [done, setDone] = useState(false);
  useEffect(() => setCards(shuffle(playable.flatMap((v) => [{ key: `${v.id}-media`, pair: v.id, type: 'media', value: v.videoUrl || v.imageUrl }, { key: `${v.id}-word`, pair: v.id, type: 'word', value: v.word }]))), [playable]);
  const flip = (index: number) => { if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return; const next = [...flipped, index]; setFlipped(next); if (next.length === 2) { setMoves((v) => v + 1); if (cards[next[0]].pair === cards[next[1]].pair) { const nextMatched = [...matched, ...next]; setMatched(nextMatched); setFlipped([]); if (nextMatched.length === cards.length) { setDone(true); LearnModel.saveTopicGameAttempt(topicId, { gameType: 'MEMORY_MATCH', score: playable.length * 100, matchedPairs: playable.length, totalPairs: playable.length, moves: moves + 1 }).catch(() => message.error('Không thể lưu kết quả trò chơi')); } } else setTimeout(() => setFlipped([]), 800); } };
  if (playable.length < 2) return <EmptyState text="Cần ít nhất 2 từ có hình ảnh hoặc video để tạo trò chơi." />;
  if (done) return <Result title="Hoàn thành lật thẻ" score={playable.length * 100} onRestart={() => { setMatched([]); setFlipped([]); setMoves(0); setDone(false); }} />;
  return <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><div className="mb-5 flex justify-between"><h2 className="text-xl font-bold">Lật thẻ ghi nhớ</h2><span className="text-gray-500">{matched.length / 2}/{playable.length} cặp · {moves} lượt</span></div><div className="grid grid-cols-3 gap-3 md:grid-cols-4">{cards.map((card, index) => { const open = flipped.includes(index) || matched.includes(index); return <button key={card.key} onClick={() => flip(index)} className={`aspect-square rounded-xl border-2 p-2 ${open ? 'border-primary-300 bg-white' : 'border-primary-600 bg-primary-600'}`}>{open ? card.type === 'media' ? (card.value.endsWith('.mp4') || card.value.includes('video') ? <video src={card.value} muted autoPlay loop className="h-full w-full object-contain" /> : <img src={card.value} alt="" className="h-full w-full object-contain" />) : <span className="font-bold text-primary-700">{card.value}</span> : <RotateCcw className="mx-auto text-white" />}</button>; })}</div></section>;
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center text-gray-500">{text}</div>; }
function Result({ title, score, onRestart }: { title: string; score: number; onRestart: () => void }) { return <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm"><Trophy className="mx-auto mb-4 text-yellow-500" size={52} /><h2 className="text-2xl font-bold">{title}</h2><p className="mt-3 text-4xl font-black text-primary-600">{score}%</p><button onClick={onRestart} className="mt-6 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white">Chơi lại</button></div>; }
