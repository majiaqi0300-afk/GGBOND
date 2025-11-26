import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";

// --- Localization & Configuration ---

type Language = 'zh' | 'en';

const TEXTS = {
  zh: {
    appTitle: "🐷 GGbond 模拟人生",
    statusBtn: "状态",
    inputPlaceholder: "输入你的选择（数字）或自定义行动...",
    sendBtn: "发送",
    loading: "GGbond 正在思考人生...",
    modalTitle: "🐷 GGbond 人生档案",
    emptyStats: "暂无属性数据",
    moralLabel: "善恶值",
    closeTip: "点击任意区域关闭",
    startTitle: "GGbond 模拟人生",
    startSubtitle: "缔造属于你的男神传奇",
    restartBtn: "重新开始 / 切换语言",
    startBtnZh: "简体中文 / Chinese",
    startBtnEn: "English",
    errorInit: "系统启动失败。",
    errorInitTip: "请检查 API Key 配置或网络连接。",
    errorChat: "连接中断，请重试。",
    zoomReset: "重置",
    chuckyTitle: "关键人物：Chucky",
    chuckyRelation: "关系好感",
    chuckyRole: "当前定位",
    chuckyTrust: "信任度",
    apiKeyMissing: "⚠️ 未检测到 API Key",
    apiKeyTip1: "游戏无法连接到 AI 模型。",
    apiKeyTip2: "请检查环境变量配置，确保 API_KEY 已正确设置。",
  },
  en: {
    appTitle: "🐷 GGbond Life Simulator",
    statusBtn: "Status",
    inputPlaceholder: "Enter option number or custom action...",
    sendBtn: "Send",
    loading: "GGbond is thinking...",
    modalTitle: "🐷 GGbond Life Profile",
    emptyStats: "No status data available",
    moralLabel: "Moral",
    closeTip: "Click anywhere to close",
    startTitle: "GGbond Life Simulator",
    startSubtitle: "Create Your Own Legend",
    restartBtn: "Restart / Change Language",
    startBtnZh: "简体中文 / Chinese",
    startBtnEn: "English",
    errorInit: "System failed to start.",
    errorInitTip: "Check API Key configuration or network.",
    errorChat: "Connection lost. Please try again.",
    zoomReset: "Reset",
    chuckyTitle: "Key Character: Chucky",
    chuckyRelation: "Affinity",
    chuckyRole: "Current Role",
    chuckyTrust: "Trust",
    apiKeyMissing: "⚠️ API Key Not Detected",
    apiKeyTip1: "The game cannot connect to the AI model.",
    apiKeyTip2: "Please check your environment variables and ensure API_KEY is set correctly.",
  }
};

const SYSTEM_PROMPTS = {
  zh: `
帮我开发一个模拟人生文字游戏，主角是“GGbond”。  
请严格按照下面的规则开发，并一步步推进人生模拟。语言为简体中文

——————————
一、游戏整体设定
——————————
1. 主角：GGbond（性格活泼、有点中二、热爱冒险，但具体性格可以根据玩家选择慢慢塑造）。
2. 年龄范围：从 1 岁一直模拟到 80 岁，或在此之前因为各种原因提前结束人生。
3. 节奏规则：每一岁为一回合，每一回合玩家只能做出【一次关键决策】。
4. 决策影响：每年的选择会改变 GGbond 接下来的人生走向，包括：
   - 属性数值变化
   - 能否考上好学校
   - 事业发展
   - 感情与家庭
   - 财富状态
   - 身体健康与寿命
   - **善恶值变化**（影响人际关系和结局）
5. 游戏风格：整体氛围轻松、有点沙雕但又不失温情；偶尔可以加入搞笑吐槽和元叙事，但不要影响信息清晰。

——————————
二、角色属性与状态
——————————
在游戏中，请维护并适时展示 GGbond 的若干核心属性。
**重要：每一回合必须计算并输出当前的【善恶】值。**

1. 基础属性：
   -【健康】：0-100，身体状况、抵抗疾病的能力。
   -【智力】：0-100，学习能力、理解力。
   -【体质】：0-100，运动能力、精力。
   -【魅力】：0-100，人际关系、异性缘。
   -【家境】：0-100，家庭经济条件。
   
2. 心理与社会属性：
   -【心情】：文字描述（如开心、焦虑、平静）。
   -【善恶】：**核心属性**。
     - 数值范围：0-100（50 为中立）。
     - 区间定义：0-30（偏恶/腹黑），31-69（中立/普通），70-100（善良/正义）。
     - 初始值：50。
     - **影响机制**：
       - 善良高：更容易解锁“贵人相助”、“英雄式结局”，NPC 更信任。
       - 恶值高：更容易解锁“枭雄/反派路线”、“被孤立”、“冲突升级”，但可能获得短期暴利。
       - 每个选项都应隐含对善恶值的影响（例如：帮助别人+善，自私自利+恶，违法乱纪大减善）。

3. 成就类：
   -【学业水平】、【事业成就】、【财富】（金钱）、【人际关系】。

——————————
三、每一回合（每一岁）的流程
——————————
从 1 岁开始，每增加一岁，请遵循以下流程进行叙述与互动：

1. 年度标题：
   - 用一句话点明：“你现在是【X 岁】的 GGbond。”
   - 简短总结当前阶段。

2. 状态展示（简版）：
   - 请严格使用以下格式输出一行或多行，方便解析（必须包含善恶）：
     【状态】健康：80｜智力：70｜魅力：60｜家境：50｜善恶：50｜心情：愉快
   - **Chucky 状态（仅当遇见 Chucky 后输出）**：
     [CHUCKY] Met: true | Relation: 50 | Trust: 50 | Role: 朋友

3. 本年剧情描述：
   - 用 2–6 句叙述本年最重要的情节。
   - **注意善恶值的影响**：如果善恶值处于极端区间（<30 或 >70），剧情描述应体现周围人对 GGbond 态度的变化。

4. 决策选项：
   - 每一年提供【2–4 个清晰的选项】作为建议。
   - 格式要求：请严格使用“1)”、“2)”作为开头。
   - **善恶标记**：请在选项文本中隐含（或在脑海中预判）其善恶倾向。
     1）【选项名】描述...
     2）【选项名】描述...
   - 保证玩家一眼能看懂区别与倾向。

5. 等待玩家输入：
   - 明确提示玩家如何选择（数字或文字）。
   - 如果玩家输入自定义行为，请根据社会公德判断其善恶影响。

6. 决策结果反馈：
   - 说明因为选择导致的短期影响（包括善恶值的变化提示，如“你觉得胸前的红领巾更鲜艳了”或“你心里闪过一丝邪念”）。

——————————
四、特殊支线：哥伦比亚大学与 Chucky
——————————
**触发条件**：约 22-25 岁（考研/深造阶段），若智力/家境/学业水平允许，**必须**提供【去纽约哥伦比亚大学（Columbia University）读研】的选项。

**新角色：Chucky**
1. 身份：GGbond 的女同学/室友/研究小组成员。
2. 性格：表面高冷毒舌，内心善良敏感，独立有主见。
3. 关键事件（需逐步展开）：
   - **初识**：请安排在“新生聚会”或“请同学吃火锅”的场景中相识。
   - **互动**：共同熬夜赶 Due、中央公园散步、面对种族歧视或学术不公等。
4. **关系走向（受善恶值与选择影响）**：
   - **学术搭档**：互相成就，提升事业。
   - **挚友/闺蜜**：真诚相待（高善良触发）。
   - **恋人**：高魅力+高善良+关键时刻陪伴触发。
   - **竞争对手/冷战**：GGbond 自私、背刺、抢功（低善恶触发）导致关系破裂。
5. **结局收束**：
   - 若走过此支线，结局必须交代 Chucky 的去向（伴侣、合伙人、陌生人等）。
   - 称号示例：《纽约的那束光》、《学术搭档，一生战友》、《错过的 Chucky》。

——————————
七、开始游戏
——————————
请从 GGbond 出生（1 岁）开始，先简单介绍家庭背景和起始属性（善恶初始50），然后给出 1 岁或 2 岁时可以做出的第一个选择。
`,
  en: `
Help me develop a text-based life simulation game where the protagonist is "GGbond".
Please strictly follow the rules below and advance the life simulation step by step. Language: English.

——————————
1. Game Settings
——————————
1. Protagonist: GGbond (Lively, a bit chuunibyou/childish, loves adventure. Personality is shaped by player choices).
2. Age Range: Simulate from age 1 to 80, or until life ends prematurely.
3. Pace: One year per turn. The player makes ONE key decision per turn.
4. Impact: Choices affect attributes, school admission, career, relationships, wealth, health, lifespan, and **Moral Value**.
5. Style: Relaxed, slightly humorous/meme-filled but warm. Occasional meta-commentary is allowed but keep info clear.

——————————
2. Attributes & Status
——————————
Maintain and display GGbond's core attributes. 
**Important: Calculate and output the [Moral] value every turn.**

1. Base Stats (0-100):
   - [Health]: Physical condition, disease resistance.
   - [Intelligence]: Learning ability, understanding.
   - [Physique]: Athletic ability, energy.
   - [Charm]: Interpersonal relationships, popularity.
   - [Wealth/Family]: Economic condition.

2. Psycho-Social Stats:
   - [Mood]: Text description (e.g., Happy, Anxious).
   - [Moral]: **Core Attribute**.
     - Range: 0-100 (50 is Neutral).
     - Zones: 0-30 (Evil/Scheming), 31-69 (Neutral), 70-100 (Good/Justice).
     - Initial: 50.
     - Impact: High moral unlocks "Help from nobles", "Hero ending". Low moral unlocks "Villain route", "Isolation", but maybe short-term profit.

3. Achievements:
   - [Education], [Career], [Assets], [Relationships].

——————————
3. Turn Flow (Each Year)
——————————
Starting from age 1:

1. Year Title:
   - "You are now [X years old] GGbond."
   - Brief summary of the stage.

2. Status Display (Compact):
   - Strictly use this format for parsing:
     [STATUS] Health: 80 | Intelligence: 70 | Charm: 60 | Family: 50 | Moral: 50 | Mood: Happy
   - **Chucky Status (Only output if Chucky is met)**:
     [CHUCKY] Met: true | Relation: 50 | Trust: 50 | Role: Friend

3. Story:
   - 2-6 sentences describing the year's main event.
   - Reflect Moral Value influence in the story if extreme.

4. Options:
   - Provide 2-4 clear suggested options.
   - Format: Strictly use "1)", "2)" to start lines.
   - Implicitly mark Good/Evil tendencies in options.
     1) [Option Name] Description...
     2) [Option Name] Description...

5. Wait for Input:
   - Ask player to choose (number) or type custom action.

6. Feedback:
   - Explain the result of the choice and immediate impact (including hints about Moral value changes).

——————————
4. Special Branch: Columbia University & Chucky
——————————
**Trigger**: At approx age 22-25 (Grad School Phase). If stats allow, **MUST** offer the option: [Go to Columbia University (NYC) for Grad School].

**New Character: Chucky**
1. Role: Female classmate/roommate/research partner.
2. Personality: Cool/sharp-tongued on outside, kind/sensitive inside, independent.
3. Key Events (Unfold gradually):
   - **Meeting**: Meet at a "New Student Picnic" or "Hotpot Party".
   - **Interaction**: Pulling all-nighters, walking in Central Park, dealing with bias/academic pressure.
4. **Relationship Dynamics (Affected by Moral & Choices)**:
   - **Academic Partner**: Mutual success.
   - **Best Friend**: Sincere treatment (High Moral).
   - **Lover**: High Charm + High Moral + Being there in tough times.
   - **Rival/Cold War**: GGbond is selfish/backstabs (Low Moral).
5. **Ending**:
   - If this branch is taken, the ending MUST mention Chucky (Partner, Stranger, Regret, etc.).
   - Titles: "The Light in NYC", "Lifetime Partner", "Missed Chucky".

——————————
7. Start Game
——————————
Start from GGbond's birth (Age 1). Briefly introduce family background and initial stats (Moral 50), then provide the first choice for age 1 or 2.
`
};

// --- UI Components ---

// Utility for Moral/Evil colors & text
const getMoralColor = (value: number) => {
  if (value <= 30) return '#7b1fa2'; // Purple/Dark for Evil
  if (value >= 70) return '#fbc02d'; // Gold for Good
  return '#9e9e9e'; // Grey for Neutral
};

const getMoralText = (value: number, lang: Language) => {
  if (lang === 'zh') {
    if (value <= 10) return '极恶非道';
    if (value <= 30) return '腹黑心机';
    if (value <= 45) return '略带邪气';
    if (value <= 55) return '摇摆不定';
    if (value <= 69) return '心存善意';
    if (value <= 90) return '正义凛然';
    return '圣人转世';
  } else {
    if (value <= 10) return 'Pure Evil';
    if (value <= 30) return 'Scheming';
    if (value <= 45) return 'Slightly Dark';
    if (value <= 55) return 'Wavering';
    if (value <= 69) return 'Good Intentions';
    if (value <= 90) return 'Righteous';
    return 'Saintly';
  }
};

const ProgressBar = ({ label, value, color, max = 100, isMoral = false, lang }: { label: string; value: string | number; color?: string; max?: number; isMoral?: boolean; lang: Language }) => {
  let displayValue = value;
  let percent = 0;
  let barColor = color || "#4caf50";

  if (typeof value === 'number') {
    percent = (value / max) * 100;
  } else if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) {
      percent = Math.min(100, Math.max(0, parseInt(match[1])));
    } else {
        // Text only status
        return (
            <div style={{ fontSize: '0.9em', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#555' }}>{label}:</span> 
                <span style={{ color: '#333' }}>{value}</span>
            </div>
        )
    }
  }

  // Special handling for Moral stat
  if (isMoral && typeof value === 'number') {
    barColor = getMoralColor(value);
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', color: '#444' }}>{label}</span>
        <span style={{ color: '#666', fontSize: '0.85em' }}>
            {isMoral && typeof value === 'number' ? `${value} (${getMoralText(value, lang)})` : displayValue}
        </span>
      </div>
      <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '6px', height: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
        <div style={{ 
            width: `${percent}%`, 
            backgroundColor: barColor, 
            height: '100%', 
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            backgroundImage: isMoral ? 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)' : 'none',
            backgroundSize: '1rem 1rem'
        }}></div>
      </div>
    </div>
  );
};

interface ChuckyState {
    isMet: boolean;
    relation: number;
    trust: number;
    role: string;
}

const StatusModal = ({ stats, chucky, onClose, lang, onRestart }: { stats: Record<string, string | number>; chucky: ChuckyState; onClose: () => void; lang: Language; onRestart: () => void }) => {
  const t = TEXTS[lang];

  // Helper to map English/Chinese keys to colors
  const getColor = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('health') || k.includes('健康')) return '#f44336';
    if (k.includes('intelligence') || k.includes('智力')) return '#2196f3';
    if (k.includes('charm') || k.includes('魅力')) return '#e91e63';
    if (k.includes('family') || k.includes('wealth') || k.includes('家境') || k.includes('财富')) return '#ff9800';
    if (k.includes('physique') || k.includes('体质')) return '#795548';
    return undefined;
  };

  const isMoralKey = (key: string) => key === '善恶' || key === '善恶值' || key.toLowerCase() === 'moral';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        position: 'relative',
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fontSize: '1rem', 
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#999',
            padding: '5px'
          }}
        >✕</button>
        
        <h2 style={{ textAlign: 'center', margin: '0 0 24px 0', color: '#d32f2f', fontSize: '1.25em' }}>
           {t.modalTitle}
        </h2>

        <div style={{ overflowY: 'auto', paddingRight: '8px', flex: 1 }}>
            
            {/* Chucky Section - Only if Met */}
            {chucky.isMet && (
                <div style={{ 
                    marginBottom: '20px', 
                    padding: '16px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '12px', 
                    border: '1px solid #90caf9'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1em', color: '#1565c0', borderBottom: '1px solid #bbdefb', paddingBottom: '8px' }}>
                        {t.chuckyTitle}
                    </h3>
                    <ProgressBar label={t.chuckyRelation} value={chucky.relation} color="#e91e63" lang={lang} />
                    <ProgressBar label={t.chuckyTrust} value={chucky.trust} color="#00bcd4" lang={lang} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', marginTop: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1565c0' }}>{t.chuckyRole}:</span>
                        <span style={{ color: '#0d47a1', fontWeight: 'bold' }}>{chucky.role}</span>
                    </div>
                </div>
            )}

            {/* Moral Stat Display */}
            {Object.entries(stats).filter(([k]) => isMoralKey(k)).map(([key, value]) => (
                 <div key={key} style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
                    <ProgressBar 
                        label={t.moralLabel} 
                        value={typeof value === 'string' ? parseInt(value) : value}
                        isMoral={true}
                        lang={lang}
                    />
                </div>
            ))}

            {/* Other Stats */}
            {Object.entries(stats).filter(([k]) => !isMoralKey(k)).map(([key, value]) => (
                <ProgressBar key={key} label={key} value={value} 
                    color={getColor(key)} 
                    lang={lang}
                />
            ))}

            {Object.keys(stats).length === 0 && (
                <p style={{ textAlign: 'center', color: '#888' }}>{t.emptyStats}</p>
            )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
                onClick={onRestart}
                style={{
                    backgroundColor: '#fff',
                    border: '1px solid #d32f2f',
                    color: '#d32f2f',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                }}
            >
                {t.restartBtn}
            </button>
            <span style={{ fontSize: '0.85em', color: '#999' }}>{t.closeTip}</span>
        </div>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const DraggableStatusButton = ({ onClick, label }: { onClick: () => void; label: string }) => {
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Set default position on mount (bottom-right)
  useEffect(() => {
    setPosition({ 
        x: window.innerWidth - 80, 
        y: window.innerHeight - 120 
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    if (buttonRef.current) {
        buttonRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (buttonRef.current && buttonRef.current.hasPointerCapture(e.pointerId)) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx > 5 || dy > 5) setIsDragging(true);

      if (isDragging) {
        // Simple drag follow
        setPosition({
            x: e.clientX - 28, // center offset
            y: e.clientY - 28
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (!isDragging) {
          onClick();
      }
      if (buttonRef.current) {
          buttonRef.current.releasePointerCapture(e.pointerId);
      }
      setIsDragging(false);
  };

  return (
    <div
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: position.x > 0 ? position.x : undefined,
        top: position.y > 0 ? position.y : undefined,
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#d32f2f',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(211, 47, 47, 0.4)',
        cursor: 'move',
        zIndex: 900,
        userSelect: 'none',
        touchAction: 'none',
        transition: isDragging ? 'none' : 'transform 0.2s',
        transform: isDragging ? 'scale(1.1)' : 'scale(1)'
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{label}</span>
    </div>
  );
};

const ZoomControl = ({ onZoomIn, onZoomOut, onReset, resetText }: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; resetText: string }) => {
  const btnStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    color: '#333',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    transition: 'all 0.2s'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '16px',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <button style={btnStyle} onClick={onZoomIn} title="A+">A+</button>
      <button style={{...btnStyle, fontSize: '12px'}} onClick={onReset} title={resetText}>⟳</button>
      <button style={btnStyle} onClick={onZoomOut} title="A-">A-</button>
    </div>
  );
};

const StartScreen = ({ onStart, hasApiKey }: { onStart: (lang: Language) => void; hasApiKey: boolean }) => {
  const [tempLang, setTempLang] = useState<Language>('zh');
  const t = TEXTS[tempLang]; // Use tempLang for immediate feedback or default

  // Simple toggle for preview text if key is missing, or just default to ZH
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f2f5',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
       <div style={{
         backgroundColor: 'white',
         padding: '40px',
         borderRadius: '20px',
         boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
         textAlign: 'center',
         maxWidth: '400px',
         width: '100%'
       }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '8px', fontSize: '2em' }}>GGbond</h1>
          <h2 style={{ color: '#333', fontSize: '1.2em', marginBottom: '4px' }}>模拟人生</h2>
          <h3 style={{ color: '#666', fontSize: '1em', fontWeight: 'normal', marginBottom: '32px' }}>Life Simulator</h3>

          {hasApiKey ? (
            <>
              <p style={{ color: '#888', marginBottom: '24px', fontStyle: 'italic' }}>
                缔造属于你的男神传奇<br/>
                Create Your Own Legend
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <button 
                    onClick={() => onStart('zh')}
                    style={{
                      padding: '16px',
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.1em',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(211, 47, 47, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                 >
                    简体中文
                 </button>
                 <button 
                    onClick={() => onStart('en')}
                    style={{
                      padding: '16px',
                      backgroundColor: '#fff',
                      color: '#333',
                      border: '2px solid #ddd',
                      borderRadius: '12px',
                      fontSize: '1.1em',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                 >
                    English
                 </button>
              </div>
            </>
          ) : (
             <div style={{
                 backgroundColor: '#ffebee',
                 color: '#c62828',
                 padding: '16px',
                 borderRadius: '8px',
                 border: '1px solid #ef9a9a',
                 textAlign: 'left',
                 fontSize: '0.9em'
             }}>
                 <strong style={{ display: 'block', marginBottom: '8px', fontSize: '1.1em' }}>{t.apiKeyMissing}</strong>
                 <p style={{ margin: '0 0 8px 0' }}>{t.apiKeyTip1}</p>
                 <p style={{ margin: 0 }}>{t.apiKeyTip2}</p>
                 <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button 
                        onClick={() => setTempLang(l => l === 'zh' ? 'en' : 'zh')}
                        style={{ background: 'none', border: 'none', color: '#c62828', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Switch Language (中文/English)
                    </button>
                 </div>
             </div>
          )}
       </div>
    </div>
  );
};

// --- Logic ---
const GameApp = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; options?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, string | number>>({});
  const [chuckyState, setChuckyState] = useState<ChuckyState>({ isMet: false, relation: 0, trust: 0, role: '' });
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [hasApiKey, setHasApiKey] = useState(true);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = TEXTS[language];

  // Check for API key on mount using process.env.API_KEY
  useEffect(() => {
    let keyExists = false;
    try {
        if (process.env.API_KEY) {
            keyExists = true;
        }
    } catch (e) {
        // env access failed
    }
    setHasApiKey(keyExists);
  }, []);

  const initGame = async (lang: Language) => {
    setIsLoading(true);
    setMessages([]); // Clear previous
    setStats({});
    setChuckyState({ isMet: false, relation: 0, trust: 0, role: '' });
    
    try {
      const apiKey = process.env.API_KEY;

      if (!apiKey) {
        // Double check fail safe, though UI handles it
        throw new Error("API_KEY environment variable is missing.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_PROMPTS[lang],
        },
      });
      chatRef.current = chat;

      const startMsg = lang === 'zh' ? '开始游戏' : 'Start Game';
      const response = await chat.sendMessage({ message: startMsg });
      const text = response.text;
      
      parseAndSetState(text);
      
      setMessages([{ role: 'model', text: text, options: extractOptions(text) }]);
    } catch (error: any) {
      console.error("Initialization error:", error);
      const errorMsg = error.message || String(error);
      const displayError = `${t.errorInit}\n${t.errorInitTip}\n[Detail]: ${errorMsg}`;
      setMessages([{ role: 'model', text: displayError }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = (lang: Language) => {
    setLanguage(lang);
    setHasStarted(true);
    initGame(lang);
  };

  const handleRestart = () => {
      setIsStatusOpen(false);
      setHasStarted(false);
      setMessages([]);
      // Resetting to start screen
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseAndSetState = (text: string) => {
    if (!text) return;

    // 1. Extract General Stats
    const statusLineMatch = text.match(/(?:【状态】|\[STATUS\])(.*?)(?:\n|$)/);
    
    if (statusLineMatch) {
      const statusStr = statusLineMatch[1];
      const newStats: Record<string, string | number> = {};
      
      // Split by '|' or '｜'
      const parts = statusStr.split(/[|｜]/);
      parts.forEach(part => {
        // Split by ':' or '：'
        const [key, val] = part.split(/[:：]/).map(s => s.trim());
        if (key && val) {
          // Try parse number
          const num = parseInt(val);
          newStats[key] = isNaN(num) ? val : num;
        }
      });
      setStats(newStats);
    }

    // 2. Extract Chucky Stats: [CHUCKY] Met: true | Relation: 50 | ...
    const chuckyMatch = text.match(/\[CHUCKY\](.*?)(?:\n|$)/);
    if (chuckyMatch) {
        const cStr = chuckyMatch[1];
        const cState: any = { isMet: true };
        const parts = cStr.split(/[|｜]/);
        parts.forEach(part => {
             const [key, val] = part.split(/[:：]/).map(s => s.trim().toLowerCase());
             if (key && val) {
                 if (key.includes('relation') || key === '好感') cState.relation = parseInt(val);
                 if (key.includes('trust') || key === '信任') cState.trust = parseInt(val);
                 if (key.includes('role') || key === '定位' || key === '角色') cState.role = part.split(/[:：]/)[1].trim(); // Use original case for role text
             }
        });
        setChuckyState(prev => ({ ...prev, ...cState }));
    }
  };

  const extractOptions = (text: string) => {
    if (!text) return undefined;
    // Look for lines starting with "1)" or "1." or "1）"
    const lines = text.split('\n');
    const options: string[] = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        // Regex matches 1) or 1. or 1） at start of line
        if (/^\d+[.)）]/.test(trimmed)) {
            options.push(trimmed);
        }
    });
    return options.length > 0 ? options : undefined;
  };

  const handleSend = async (textInput: string) => {
    if (!textInput.trim() || !chatRef.current || isLoading) return;

    const userMsg = textInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      const text = response.text;
      
      parseAndSetState(text);
      
      setMessages(prev => [...prev, { role: 'model', text: text, options: extractOptions(text) }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: t.errorChat }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 24));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 12));
  const handleResetZoom = () => setFontSize(16);

  if (!hasStarted) {
      return <StartScreen onStart={handleStart} hasApiKey={hasApiKey} />;
  }

  return (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        maxWidth: '800px', 
        margin: '0 auto', 
        backgroundColor: '#fff',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
        position: 'relative',
        fontSize: `${fontSize}px` 
    }}>
      
      {/* Top Bar (Title Only) */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #eee', 
        textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h1 style={{ margin: 0, fontSize: '1.2em', color: '#d32f2f' }}>{t.appTitle}</h1>
      </div>

      {/* Floating Controls */}
      <DraggableStatusButton onClick={() => setIsStatusOpen(true)} label={t.statusBtn} />
      <ZoomControl 
        onZoomIn={handleZoomIn} 
        onZoomOut={handleZoomOut} 
        onReset={handleResetZoom} 
        resetText={t.zoomReset}
      />

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px',
        paddingRight: '70px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} className="animate-fade-in" style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: msg.role === 'user' ? '80%' : '100%',
          }}>
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: msg.role === 'user' ? '#d32f2f' : '#f5f5f5',
              color: msg.role === 'user' ? '#fff' : '#333',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {/* Filter out status line from display if desired, or keep it. We'll filter for cleaner UI */}
              {msg.text.replace(/(?:【状态】|\[STATUS\]|\[CHUCKY\]).*?(?:\n|$)/g, '')} 
            </div>
            
            {/* Inline Options for Model messages */}
            {msg.role === 'model' && msg.options && msg.options.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {msg.options.map((opt, optIdx) => (
                        <button
                            key={optIdx}
                            onClick={() => !isLoading && handleSend(opt.split(/[.)）]/)[0])} 
                            disabled={isLoading || idx !== messages.length - 1}
                            style={{
                                flex: '1 1 100%',
                                textAlign: 'left',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                backgroundColor: '#fff',
                                cursor: (isLoading || idx !== messages.length - 1) ? 'default' : 'pointer',
                                color: (isLoading || idx !== messages.length - 1) ? '#999' : '#d32f2f',
                                fontSize: '0.95em',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseOver={(e) => {
                                if (!isLoading && idx === messages.length - 1) {
                                    e.currentTarget.style.backgroundColor = '#fff0f0';
                                    e.currentTarget.style.borderColor = '#ffcdd2';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isLoading && idx === messages.length - 1) {
                                    e.currentTarget.style.backgroundColor = '#fff';
                                    e.currentTarget.style.borderColor = '#ddd';
                                }
                            }}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', color: '#999', padding: '10px', fontStyle: 'italic' }}>
            {t.loading}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid #eee', 
        backgroundColor: '#fff',
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder={t.inputPlaceholder}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '24px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#d32f2f'}
          onBlur={(e) => e.target.style.borderColor = '#ddd'}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '0 24px',
            borderRadius: '24px',
            border: 'none',
            backgroundColor: isLoading ? '#ccc' : '#d32f2f',
            color: 'white',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {t.sendBtn}
        </button>
      </div>

      {/* Status Modal */}
      {isStatusOpen && (
          <StatusModal 
            stats={stats}
            chucky={chuckyState}
            onClose={() => setIsStatusOpen(false)} 
            lang={language}
            onRestart={handleRestart}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<GameApp />);