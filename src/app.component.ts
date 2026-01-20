// ... 原有的 imports
// 記得引入 ElementRef (如果你還沒引入)

export class AppComponent {
  // ... 原有的變數

  // --- 新增：知識卡片筆記系統 ---
  taskNotes = signal<Record<string, string>>({}); // 儲存每個任務的筆記 { "任務名稱": "筆記內容" }
  activeTask = signal<string | null>(null); // 當前正在編輯/查看的任務
  
  // 開啟筆記視窗 (防止觸發 checkbox 的 toggle)
  openTaskNote(task: string, event: Event) {
    event.stopPropagation(); // 阻止事件冒泡，避免勾選 checkbox
    this.activeTask.set(task);
  }

  // 關閉筆記視窗
  closeTaskNote() {
    this.activeTask.set(null);
  }

  // 儲存筆記
  saveCurrentTaskNote(content: string) {
    const task = this.activeTask();
    if (task) {
      this.taskNotes.update(notes => ({ ...notes, [task]: content }));
    }
  }

  // 取得當前任務的筆記內容
  getCurrentTaskNoteContent(): string {
    return this.taskNotes()[this.activeTask()!] || '';
  }

  // 判斷該任務是否有筆記 (用於顯示不同顏色的圖標)
  hasNote(task: string): boolean {
    return !!this.taskNotes()[task] && this.taskNotes()[task].trim().length > 0;
  }

  constructor() {
    // ... 原有的 constructor 內容

    // --- 新增：讀取與儲存 taskNotes 到 LocalStorage ---
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedTaskNotes = localStorage.getItem('quant_task_notes');
        if (savedTaskNotes) this.taskNotes.set(JSON.parse(savedTaskNotes));
      } catch (e) { console.warn('Failed to load task notes', e); }
    }

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('quant_task_notes', JSON.stringify(this.taskNotes()));
      }
    });
  }
  // ...
}
