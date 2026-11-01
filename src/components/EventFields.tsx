import { EVENT_SUGGESTIONS, type CategoryInfo } from "@/lib/meta";
import { CategoryPicker } from "./CategoryPicker";
import { SuggestInput } from "./SuggestInput";
import { TimeFields, Toggle } from "./TimeFields";

type Values = {
  title?: string;
  category?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  place?: string | null;
  memo?: string | null;
};

/**
 * 이벤트 만들기·수정 공통 칸: 카테고리, 제목, 날짜(미정), 시간(하루 종일), 장소, 메모.
 * '하루 종일'·'날짜 미정'을 켜면 서버에서 시간·날짜를 비움
 */
export function EventFields({ categories, v = {}, withMemo = true }: { categories: CategoryInfo[]; v?: Values; withMemo?: boolean }) {
  return (
    <>
      <CategoryPicker categories={categories} value={v.category} />
      <div className="space-y-1.5">
        <label htmlFor="event-title" className="label block">제목</label>
        <SuggestInput id="event-title" name="title" defaultValue={v.title} suggestions={EVENT_SUGGESTIONS} placeholder="예) 스튜디오 촬영" required maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="date" className="label">날짜</label>
          <Toggle name="undated" label="날짜 미정" defaultChecked={false} />
        </div>
        <input id="date" name="date" type="date" defaultValue={v.date} className="input" />
      </div>
      <TimeFields start={v.startTime} end={v.endTime} />
      <label className="block space-y-1.5">
        <span className="label">장소</span>
        <input name="place" defaultValue={v.place ?? ""} placeholder="장소를 입력해 주세요" maxLength={100} className="input" />
      </label>
      {withMemo && (
        <label className="block space-y-1.5">
          <span className="label">메모</span>
          <textarea name="memo" defaultValue={v.memo ?? ""} rows={4} maxLength={5000} placeholder="추가 내용을 입력해 주세요" className="input resize-y leading-relaxed" />
        </label>
      )}
    </>
  );
}

