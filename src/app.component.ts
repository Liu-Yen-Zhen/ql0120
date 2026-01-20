import { Component, inject, signal, computed, effect, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { MarkdownModule, provideMarkdown } from 'ngx-markdown';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';

interface WeekData {
  id: number;
  title: string;
  phase: string;
  phaseId: number;
  summary: string;
  keyConcepts: string[];
  skills: { [key: string]: number };
}

interface DailyTask {
  day_id: string;
  title: string;
  am: { topic: string; tasks: string[] };
  pm: { topic: string; tasks: string[] };
  night: { topic: string; tasks: string[] };
  yushi_focus: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MarkdownModule, FormsModule],
  providers: [provideMarkdown({ katex: true })], // 啟用 KaTeX 數學公式
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private platformId = inject(PLATFORM_ID); // 注入平台 ID 用於檢測是否為瀏覽器
  radarChartContainer = viewChild<ElementRef>('radarChart');

  // --- State ---
  activeTab = signal<'roadmap' | 'interview' | 'project'>('roadmap');
  selectedWeekId = signal<number>(1);
  selectedDayIndex = signal<number>(0);

  // Completed Tasks
  completedTasks = signal<Set<string>>(new Set<string>());
  
  // Block Notes System (Key: "W1D1_am", Value: "My notes...")
  blockNotes = signal<Record<string, string>>({});
  
  // Track which block is currently being edited
  editingBlock = signal<string | null>(null);

  // AI & Interview State
  tutorLoading = signal<boolean>(false);
  tutorResponse = signal<string>('');
  tutorConcept = signal<string>('');
  interviewQuestion = signal<string>('');
  interviewAnswer = signal<string>('');
  showAnswer = signal<boolean>(false);
  interviewLoading = signal<boolean>(false);

  // --- Data Definitions (省略部分資料以節省空間，請保持你原有的 phases 和 weeksData) ---
  phases = [
    { id: 1, name: '第一階段：量化基石與計算思維', weeks: [1, 2, 3], color: 'text-cyan-400', border: 'border-cyan-400' },
    { id: 2, name: '第二階段：數據工程與事件驅動', weeks: [4, 5, 6], color: 'text-emerald-400', border: 'border-emerald-400' },
    { id: 3, name: '第三階段：策略開發與機器學習', weeks: [7, 8, 9, 10], color: 'text-purple-400', border: 'border-purple-400' },
    { id: 4, name: '第四階段：專題產出與職涯衝刺', weeks: [11, 12], color: 'text-rose-400', border: 'border-rose-400' }
  ];

  // 請保留你原本完整的 weeksData 和 detailedSchedule 資料
  // 這裡為了確保程式碼正確，我放上簡略版，請用你原本完整的資料替換這裡
  weeksData: WeekData[] = [
    { id: 1, phase: '量化基石', phaseId: 1, title: '概率論、統計學與量化面試思維', summary: '建立貝氏思維與概率直覺。', keyConcepts: ['Bayesian Inference', 'Poisson Distribution'], skills: { Math: 90, Coding: 60, Trading: 20, ML: 10, Micro: 30 } },
    // ... 請確保這裡有完整的 1-12 週資料 ...
  ];

  // 請保留你原本完整的 detailedSchedule 資料
  detailedSchedule: { [key: number]: DailyTask[] } = {
     1: [
      { day_id: "W1D1", title: "機率論、貝氏定理與大數法則", am: { topic: "機率論基礎與貝氏推論", tasks: ["研讀貝氏定理公式 $P(A|B)$", "推導隨機變數期望值與方差", "解題：Heard on the Street 機率前 5 題"] }, pm: { topic: "Python 高性能運算：NumPy", tasks: ["實作向量化運算 (Vectorization)", "撰寫 NumPy Broadcasting 練習", "計算資產報酬率協方差矩陣"] }, night: { topic: "LeetCode: Array 專題", tasks: ["Two Sum", "Best Time to Buy and Sell Stock", "Product of Array Except Self"] }, yushi_focus: "優式重視代碼效率。確保 NumPy 運算不含 Python 原生迴圈，並能解釋信噪比 (SNR)。" },
      { day_id: "W1D2", title: "分佈特徵：肥尾與偏度", am: { topic: "機率分佈的市場映射", tasks: ["比較 Normal vs Log-normal 分佈", "學習 Jarque-Bera Test 檢定", "研讀泊松分佈與訂單到達率"] }, pm: { topic: "Pandas：數據清洗與記憶體優化", tasks: ["實作數據降位存儲 (float64->32)", "撰寫自定義 Rolling 加速器", "清洗 Tick Data 異常值"] }, night: { topic: "LeetCode: Array 專題", tasks: ["Maximum Subarray", "3Sum", "Rotate Image"] }, yushi_focus: "理解泊松分佈 $\\lambda$ 如何對應到 HFT 的掛單時間，並關注肥尾效應 (Fat Tails)。" },
      { day_id: "W1D3", title: "時間序列基礎與平穩性", am: { topic: "平穩性檢定理論", tasks: ["研讀 ADF Test 與 KPSS Test", "理解隨機漫步 (Random Walk)", "幾何機率問題練習"] }, pm: { topic: "視覺化：Plotly 互動式圖表", tasks: ["開發動態指標 Dash 預型", "繪製相關性熱力圖", "實作 Volume Profile 圖表"] }, night: { topic: "LeetCode: Hash Table", tasks: ["Group Anagrams", "Longest Consecutive Sequence"] }, yushi_focus: "回測時需嚴格過濾前視偏誤 (Look-ahead Bias) 與倖存者偏差。" },
      { day_id: "W1D4", title: "線性代數：PCA 與降維", am: { topic: "PCA 在因子解釋力的應用", tasks: ["推導 SVD 分解", "理解 PCA 與穩定狀態計算", "腦力激盪：經典面試題衝刺"] }, pm: { topic: "高性能：Numba JIT 加速", tasks: ["使用 @njit 優化 Black-Scholes", "比較 Python/NumPy/Numba 效能", "實作簡單的 Cython 編譯"] }, night: { topic: "LeetCode: Sliding Window", tasks: ["Longest Substring", "Longest Repeating Replacement"] }, yushi_focus: "優式重視代碼性能。利用 Numba 將運算加速至毫秒等級。" },
      { day_id: "W1D5", title: "面試思維與本週總結", am: { topic: "凱利公式與勝率估算", tasks: ["推導 Kelly Criterion", "分析聖彼得堡悖論", "整理數學推導筆記"] }, pm: { topic: "數據存儲：Parquet 與 HDF5", tasks: ["測試 CSV/Parquet 讀寫速度", "建立本地量化資料庫雛型", "封裝 Data Loader 類別"] }, night: { topic: "週複習與 Medium 產出", tasks: ["重刷本週錯題", "撰寫 Medium 學習總結：量化面試機率直覺"] }, yushi_focus: "展現良好的技術文檔能力，這代表你能與團隊高效溝通研究結果。" }
    ],
    // ... 請確保這裡有完整的 1-12 週資料，不要刪除 ...
  };

  constructor() {
    // 關鍵修正：只在瀏覽器端執行 localStorage 讀取
    if (isPlatformBrowser(this.platformId)) {
      try {
        const savedTasks = localStorage.getItem('quant_tasks');
        if (savedTasks) this.completedTasks.set(new Set(JSON.parse(savedTasks)));
        
        const savedNotes = localStorage.getItem('quant_block_notes');
        if (savedNotes) this.blockNotes.set(JSON.parse(savedNotes));
      } catch (e) {
        console.warn('Failed to load data', e);
      }
    }

    // Effect 也加上保護
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('quant_tasks', JSON.stringify(Array.from(this.completedTasks())));
      }
    });

    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('quant_block_notes', JSON.stringify(this.blockNotes()));
      }
    });

    // Draw Chart
    effect(() => {
      const skills = this.currentEarnedSkills();
      // 確保只在瀏覽器且有資料時繪製
      if (this.activeTab() === 'roadmap' && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.drawRadarChart(skills), 100);
      }
    });
  }

  // --- Computed Skills ---
  totalPossibleSkills = computed(() => {
    const total: { [key: string]: number } = { Math: 0, Coding: 0, Trading: 0, ML: 0, Micro: 0 };
    this.weeksData.forEach(w => Object.keys(w.skills).forEach(k => total[k] = (total[k] || 0) + w.skills[k]));
    return total;
  });

  currentEarnedSkills = computed(() => {
    const current: { [key: string]: number } = { Math: 0, Coding: 0, Trading: 0, ML: 0, Micro: 0 };
    const completed = this.completedTasks();
    this.weeksData.forEach(week => {
      const weekTasks = this.detailedSchedule[week.id];
      if (!weekTasks) return;
      const allTasks = weekTasks.flatMap(d => [...d.am.tasks, ...d.pm.tasks, ...d.night.tasks]);
      if (allTasks.length === 0) return;
      const ratio = allTasks.filter(t => completed.has(t)).length / allTasks.length;
      Object.keys(week.skills).forEach(k => current[k] = (current[k] || 0) + (week.skills[k] * ratio));
    });
    const normalized: any = {};
    const max = this.totalPossibleSkills();
    Object.keys(current).forEach(k => normalized[k] = max[k] > 0 ? (current[k] / max[k]) * 100 : 0);
    return normalized;
  });

  // --- Helpers ---
  currentWeekData = computed(() => this.weeksData.find(w => w.id === this.selectedWeekId()));
  currentPhaseData = computed(() => this.phases.find(p => p.id === this.currentWeekData()?.phaseId));
  currentWeekSchedule = computed(() => this.detailedSchedule[this.selectedWeekId()] || []);
  currentDaySchedule = computed(() => this.currentWeekSchedule()[this.selectedDayIndex()] || this.currentWeekSchedule()[0]);
  
  getNoteKey(period: 'am' | 'pm' | 'night'): string {
    const dayId = this.currentDaySchedule()?.day_id;
    return `${dayId}_${period}`;
  }

  getNoteContent(period: 'am' | 'pm' | 'night'): string {
    return this.blockNotes()[this.getNoteKey(period)] || '';
  }

  // --- Actions ---
  selectWeek(id: number) { this.selectedWeekId.set(id); this.selectedDayIndex.set(0); this.resetAI(); }
  selectDay(index: number) { this.selectedDayIndex.set(index); }
  setTab(tab: 'roadmap' | 'interview' | 'project') { this.activeTab.set(tab); }
  resetAI() { this.tutorResponse.set(''); this.tutorConcept.set(''); }

  toggleTask(task: string) {
    this.completedTasks.update(set => {
      const newSet = new Set(set);
      newSet.has(task) ? newSet.delete(task) : newSet.add(task);
      return newSet;
    });
  }
  isTaskCompleted(task: string) { return this.completedTasks().has(task); }

  // --- Note Logic ---
  startEditing(period: 'am' | 'pm' | 'night') {
    this.editingBlock.set(this.getNoteKey(period));
  }

  saveNote(period: 'am' | 'pm' | 'night', content: string) {
    const key = this.getNoteKey(period);
    this.blockNotes.update(notes => ({ ...notes, [key]: content }));
    this.editingBlock.set(null); 
  }
  
  cancelEdit() {
    this.editingBlock.set(null);
  }

  isEditing(period: 'am' | 'pm' | 'night'): boolean {
    return this.editingBlock() === this.getNoteKey(period);
  }

  // --- D3 ---
  drawRadarChart(skills: { [key: string]: number }) {
    if (!this.radarChartContainer()) return;
    const element = this.radarChartContainer()!.nativeElement;
    d3.select(element).selectAll('*').remove();
    const width = 300, height = 300, margin = 60, radius = Math.min(width, height) / 2 - margin;
    const svg = d3.select(element).append('svg').attr('width', width).attr('height', height).append('g').attr('transform', `translate(${width/2},${height/2})`);
    
    const axisConfig = [ { k: 'Math', l: '數學' }, { k: 'Coding', l: '程式' }, { k: 'Trading', l: '策略' }, { k: 'ML', l: '機器學習' }, { k: 'Micro', l: '微結構' } ];
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);
    const angleSlice = Math.PI * 2 / axisConfig.length;

    // Grid
    [20, 40, 60, 80, 100].forEach(level => {
      const coords = axisConfig.map((_, i) => ({ x: rScale(level) * Math.cos(angleSlice * i - Math.PI/2), y: rScale(level) * Math.sin(angleSlice * i - Math.PI/2) }));
      svg.append('path').datum([...coords, coords[0]]).attr('d', d3.line<any>().x(d=>d.x).y(d=>d.y)).attr('fill', 'none').attr('stroke', '#334155').attr('stroke-width', 1);
    });

    // Axes
    axisConfig.forEach((axis, i) => {
      const x = rScale(100) * Math.cos(angleSlice * i - Math.PI/2);
      const y = rScale(100) * Math.sin(angleSlice * i - Math.PI/2);
      svg.append('line').attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y).attr('stroke', '#334155');
      svg.append('text').attr('x', x * 1.15).attr('y', y * 1.15).text(axis.l).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('fill', '#94a3b8').style('font-size', '12px');
    });

    // Data
    const dataCoords = axisConfig.map((axis, i) => ({ x: rScale(skills[axis.k] || 0) * Math.cos(angleSlice * i - Math.PI/2), y: rScale(skills[axis.k] || 0) * Math.sin(angleSlice * i - Math.PI/2) }));
    svg.append('path').datum([...dataCoords, dataCoords[0]]).attr('d', d3.line<any>().x(d=>d.x).y(d=>d.y)).attr('fill', 'rgba(20, 184, 166, 0.2)').attr('stroke', '#14b8a6').attr('stroke-width', 2);
    
    // Points
    dataCoords.forEach(p => svg.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', 4).attr('fill', '#14b8a6'));
  }

  // --- AI Wrappers ---
  async askAiTutor(concept: string) {
    this.tutorLoading.set(true); this.tutorConcept.set(concept); this.tutorResponse.set('');
    this.tutorResponse.set(await this.geminiService.explainConcept(concept, this.currentWeekData()?.summary || ''));
    this.tutorLoading.set(false);
  }

  async generateQuestion() {
    this.interviewLoading.set(true); this.showAnswer.set(false); this.interviewQuestion.set('');
    const res = await this.geminiService.generateInterviewQuestion();
    this.interviewQuestion.set(res.question); this.interviewAnswer.set(res.answer);
    this.interviewLoading.set(false);
  }
  toggleAnswer() { this.showAnswer.update(v => !v); }
}
// 新增這個方法
async summarizeDailyLogs(logs: {type: string, content: string}[], dayTitle: string): Promise<string> {
  if (!this.ai) return '請先設定 API Key。';

  const model = 'gemini-2.5-flash';
  // 將筆記轉換成文字串
  const logsText = logs.map(l => `[${l.type.toUpperCase()}] ${l.content}`).join('\n');

  const prompt = `
    你是一位量化交易學習助手。使用者今天學習了 "${dayTitle}"，以下是他的零散筆記：
    
    ${logsText}
    
    請幫我將這些筆記整理成一份結構化的「每日複習摘要 (Daily Recap)」，使用 Markdown 格式：
    1. **核心概念 (Key Concepts)**：今天學到的數學或金融理論重點。
    2. **技術實作 (Implementation)**：寫了什麼程式碼，用了什麼庫 (Numpy/Pandas)。
    3. **問題與解決 (Debug Log)**：遇到的錯誤及解決方法（這點很重要）。
    4. **Action Item**：明天需要繼續深入或改進的地方。
    
    請用繁體中文，保持簡潔專業，適合日後快速回顧。
  `;

  try {
    const response = await this.ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text || '無法生成摘要。';
  } catch (error) {
    return '生成失敗，請檢查 API。';
  }
}
