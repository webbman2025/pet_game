import { useEffect, useState } from 'react'
import './App.css'

type ActionKey = 'feed' | 'walk' | 'spa'
type TaskCounts = Record<ActionKey, number>

type StoredGameData = {
  petName: string
  tutorialComplete: boolean
  satisfaction: number
  points: number
  tasks: TaskCounts
  feedAvailableAt: number | null
  walkAvailableAt: number | null
  spaAvailableAt: number | null
  bonusAwarded: boolean
  lastResetDay: string
  nextPoopAt: number | null
  poopVisible: boolean
  poopExpiresAt: number | null
}

const STORAGE_KEY = 'pet-game-data-v1'

const actions = [
  {
    key: 'feed' as const,
    label: 'Feed',
    satisfaction: 10,
    points: 5,
    target: 3,
    description: 'Feed your dog to keep energy high.',
  },
  {
    key: 'walk' as const,
    label: 'Walk',
    satisfaction: 12,
    points: 8,
    target: 2,
    description: 'A walk raises mood and happiness.',
  },
  {
    key: 'spa' as const,
    label: 'Spa',
    satisfaction: 14,
    points: 12,
    target: 1,
    description: 'A spa session refreshes your dog.',
  },
]

const tutorialSteps = [
  {
    title: 'Welcome to your dog care game!',
    text: 'Name your dog and learn how to keep it happy with daily actions.',
  },
  {
    title: 'Daily Tasks',
    text: 'Complete Walk × 2, Feed × 3, and Spa × 1 each day to earn points.',
  },
  {
    title: 'Cooldowns & Events',
    text: 'Feed has a 2-hour cooldown, Walk locks after 2 walks for 30 minutes, and Spa resets tomorrow. Clean poop to prevent satisfaction loss.',
  },
  {
    title: 'Earn Rewards',
    text: 'Keep satisfaction high and complete all tasks for bonus points and top-ranking prizes.',
  },
]

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const getTodayString = () => new Date().toISOString().slice(0, 10)

const getTomorrowStart = () => {
  const next = new Date()
  next.setHours(24, 0, 0, 0)
  return next.getTime()
}

const formatTimeRemaining = (durationMs: number) => {
  if (durationMs <= 0) return 'Ready'
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

const getRandomPoopSpawn = () => Date.now() + Math.floor(Math.random() * 25000 + 20000)

function App() {
  const [loaded, setLoaded] = useState(false)
  const [petName, setPetName] = useState('')
  const [pendingName, setPendingName] = useState('')
  const [screen, setScreen] = useState<'entry' | 'tutorial' | 'home'>('entry')
  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialComplete, setTutorialComplete] = useState(false)
  const [satisfaction, setSatisfaction] = useState(68)
  const [points, setPoints] = useState(25)
  const [tasks, setTasks] = useState<TaskCounts>({ feed: 0, walk: 0, spa: 0 })
  const [feedAvailableAt, setFeedAvailableAt] = useState<number | null>(null)
  const [walkAvailableAt, setWalkAvailableAt] = useState<number | null>(null)
  const [spaAvailableAt, setSpaAvailableAt] = useState<number | null>(null)
  const [bonusAwarded, setBonusAwarded] = useState(false)
  const [lastResetDay, setLastResetDay] = useState(getTodayString())
  const [gameMode, setGameMode] = useState<'none' | 'treat' | 'frisbee'>('none')
  const [treatClicks, setTreatClicks] = useState(0)
  const [treatGoal, setTreatGoal] = useState(0)
  const [frisbeeClicks, setFrisbeeClicks] = useState(0)
  const [frisbeeGoal, setFrisbeeGoal] = useState(0)
  const [poopVisible, setPoopVisible] = useState(false)
  const [poopExpiresAt, setPoopExpiresAt] = useState<number | null>(null)
  const [nextPoopAt, setNextPoopAt] = useState<number>(getRandomPoopSpawn)
  const [message, setMessage] = useState('Welcome! Take care of your dog and play mini-games to earn points.')
  const [timeNow, setTimeNow] = useState(Date.now())

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const today = getTodayString()

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredGameData
        const parsedLastResetDay = parsed.lastResetDay ?? today

        setPetName(parsed.petName || '')
        setTutorialComplete(parsed.tutorialComplete ?? false)
        setSatisfaction(parsed.satisfaction ?? 68)
        setPoints(parsed.points ?? 25)
        setTasks(parsed.tasks ?? { feed: 0, walk: 0, spa: 0 })
        setFeedAvailableAt(parsed.feedAvailableAt ?? null)
        setWalkAvailableAt(parsed.walkAvailableAt ?? null)
        setSpaAvailableAt(parsed.spaAvailableAt ?? null)
        setBonusAwarded(parsed.bonusAwarded ?? false)
        setLastResetDay(parsedLastResetDay)
        setNextPoopAt(parsed.nextPoopAt ?? getRandomPoopSpawn())
        setPoopVisible(parsed.poopVisible ?? false)
        setPoopExpiresAt(parsed.poopExpiresAt ?? null)
        setScreen(parsed.tutorialComplete ? 'home' : 'tutorial')

        if (today !== parsedLastResetDay) {
          setTasks({ feed: 0, walk: 0, spa: 0 })
          setBonusAwarded(false)
          setSpaAvailableAt(null)
          setWalkAvailableAt(null)
          setLastResetDay(today)
          setMessage('Welcome to a fresh day! Your daily tasks are ready.')
        }
      } catch {
        setScreen('entry')
      }
    } else {
      setScreen('entry')
    }

    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const stored: StoredGameData = {
      petName,
      tutorialComplete,
      satisfaction,
      points,
      tasks,
      feedAvailableAt,
      walkAvailableAt,
      spaAvailableAt,
      bonusAwarded,
      lastResetDay,
      nextPoopAt,
      poopVisible,
      poopExpiresAt,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }, [
    loaded,
    petName,
    tutorialComplete,
    satisfaction,
    points,
    tasks,
    feedAvailableAt,
    walkAvailableAt,
    spaAvailableAt,
    bonusAwarded,
    lastResetDay,
    nextPoopAt,
    poopVisible,
    poopExpiresAt,
  ])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeNow(Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const now = Date.now()
    const today = getTodayString()

    if (today !== lastResetDay) {
      setTasks({ feed: 0, walk: 0, spa: 0 })
      setBonusAwarded(false)
      setSpaAvailableAt(null)
      setWalkAvailableAt(null)
      setLastResetDay(today)
      setMessage('A new day has started. Daily tasks have been reset.')
    }

    if (poopVisible && poopExpiresAt && now >= poopExpiresAt) {
      setPoopVisible(false)
      setPoopExpiresAt(null)
      setNextPoopAt(getRandomPoopSpawn())
      setSatisfaction((value) => clamp(value - 7, 0, 100))
      setMessage('Uh oh! Poop was ignored. Satisfaction dropped.')
    }

    if (!poopVisible && nextPoopAt && now >= nextPoopAt) {
      setPoopVisible(true)
      setPoopExpiresAt(now + 30000)
      setMessage('Poop appeared! Clean it quickly to avoid losing satisfaction.')
    }
  }, [loaded, timeNow, poopVisible, poopExpiresAt, nextPoopAt, lastResetDay])

  useEffect(() => {
    if (!loaded) return
    const allTasksDone = tasks.feed >= 3 && tasks.walk >= 2 && tasks.spa >= 1
    if (allTasksDone && satisfaction >= 100 && !bonusAwarded) {
      setBonusAwarded(true)
      setPoints((value) => value + 20)
      setMessage('Perfect day! All tasks done with 100% satisfaction. Bonus awarded.')
    }
  }, [tasks.feed, tasks.walk, tasks.spa, satisfaction, bonusAwarded, loaded])

  const feedCooldown = feedAvailableAt && timeNow < feedAvailableAt ? feedAvailableAt - timeNow : 0
  const walkCooldown = walkAvailableAt && timeNow < walkAvailableAt ? walkAvailableAt - timeNow : 0
  const spaCooldown = spaAvailableAt && timeNow < spaAvailableAt ? spaAvailableAt - timeNow : 0

  const isFeedAvailable = tasks.feed < 3 && feedCooldown === 0
  const isWalkAvailable = tasks.walk < 2 && walkCooldown === 0
  const isSpaAvailable = tasks.spa < 1 && spaCooldown === 0

  const savePetName = () => {
    const trimmed = pendingName.trim()
    if (!trimmed) return
    setPetName(trimmed)
    setPendingName('')
    setScreen('tutorial')
    setMessage(`Welcome, ${trimmed}! Let's learn how to care for your dog.`)
  }

  const advanceTutorial = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep((step) => step + 1)
      return
    }
    setTutorialComplete(true)
    setScreen('home')
    setMessage(`Great! ${petName} is ready for their first day of care.`)
  }

  const resetDay = () => {
    setTasks({ feed: 0, walk: 0, spa: 0 })
    setBonusAwarded(false)
    setSpaAvailableAt(null)
    setWalkAvailableAt(null)
    setLastResetDay(getTodayString())
    setMessage('A new day begins! Daily tasks are reset so you can care for your dog again.')
  }

  const completeAction = (action: (typeof actions)[number]) => {
    const now = Date.now()

    if (action.key === 'feed' && !isFeedAvailable) {
      setMessage(feedCooldown > 0 ? `Feed is on cooldown for ${formatTimeRemaining(feedCooldown)}.` : 'Feed is already complete for today.')
      return
    }

    if (action.key === 'walk' && !isWalkAvailable) {
      setMessage(walkCooldown > 0 ? `Walk is on cooldown for ${formatTimeRemaining(walkCooldown)}.` : 'Walk is already complete for today.')
      return
    }

    if (action.key === 'spa' && !isSpaAvailable) {
      setMessage(spaCooldown > 0 ? `Spa is not ready until ${formatTimeRemaining(spaCooldown)}.` : 'Spa is already complete for today.')
      return
    }

    setTasks((prev) => ({
      ...prev,
      [action.key]: prev[action.key] + 1,
    }))
    setSatisfaction((value) => clamp(value + action.satisfaction, 0, 100))
    setPoints((value) => value + action.points)

    if (action.key === 'feed') {
      setFeedAvailableAt(now + 2 * 60 * 60 * 1000)
      setMessage(`Feed completed. Satisfaction +${action.satisfaction}. Next feed available in 2 hours.`)
    }

    if (action.key === 'walk') {
      const nextWalkCount = tasks.walk + 1
      if (nextWalkCount >= 2) {
        setWalkAvailableAt(now + 30 * 60 * 1000)
        setMessage(`Walk completed. Satisfaction +${action.satisfaction}. Walk is on cooldown for 30 minutes.`)
      } else {
        setMessage(`Walk completed. Satisfaction +${action.satisfaction}. One more walk to finish the task.`)
      }
    }

    if (action.key === 'spa') {
      setSpaAvailableAt(getTomorrowStart())
      setMessage(`Spa completed. Satisfaction +${action.satisfaction}. Spa resets tomorrow.`)
    }
  }

  const startTreatGame = () => {
    const nextGoal = Math.floor(Math.random() * 3) + 3
    setTreatGoal(nextGoal)
    setTreatClicks(0)
    setGameMode('treat')
    setMessage(`Treat Toss started! Click exactly ${nextGoal} times for a bonus.`)
  }

  const playTreat = () => {
    setTreatClicks((current) => {
      const next = current + 1
      if (next === treatGoal) {
        setPoints((value) => value + 18)
        setSatisfaction((value) => clamp(value + 10, 0, 100))
        setGameMode('none')
        setMessage('Perfect toss! Your dog loved it and earned 18 points.')
      } else if (next > treatGoal) {
        setPoints((value) => value + 6)
        setSatisfaction((value) => clamp(value + 4, 0, 100))
        setGameMode('none')
        setMessage('Too many treats, but you still earned some points.')
      } else {
        setMessage(`Good toss! ${treatGoal - next} more clicks to win.`)
      }
      return next
    })
  }

  const startFrisbeeGame = () => {
    const nextGoal = Math.floor(Math.random() * 5) + 7
    setFrisbeeGoal(nextGoal)
    setFrisbeeClicks(0)
    setGameMode('frisbee')
    setMessage(`Frisbee Catch started! Click ${nextGoal} times before your dog gets bored.`)
  }

  const playFrisbee = () => {
    setFrisbeeClicks((current) => {
      const next = current + 1
      if (next >= frisbeeGoal) {
        setPoints((value) => value + 22)
        setSatisfaction((value) => clamp(value + 12, 0, 100))
        setGameMode('none')
        setMessage('Great catch! You finished the frisbee game and gained 22 points.')
      } else {
        setPoints((value) => value + 2)
        setSatisfaction((value) => clamp(value + 1, 0, 100))
        setMessage(`Catch count: ${next}/${frisbeeGoal}. Keep going!`)
      }
      return next
    })
  }

  const cleanPoop = () => {
    setPoopVisible(false)
    setPoopExpiresAt(null)
    setNextPoopAt(getRandomPoopSpawn())
    setPoints((value) => value + 4)
    setMessage('Nice! You cleaned the poop and prevented a satisfaction loss.')
  }

  if (!loaded) {
    return <div className="app-shell">Loading...</div>
  }

  if (screen === 'entry') {
    return (
      <div className="app-shell entry-screen">
        <section className="hero-card">
          <div className="hero-avatar">🐶</div>
          <div className="hero-info">
            <h1>Welcome to Pet Care Adventure</h1>
            <p>First time here? Give your dog a name and start the tutorial.</p>
          </div>
        </section>
        <div className="card-panel">
          <label htmlFor="pet-name">Pet name</label>
          <input
            id="pet-name"
            type="text"
            value={pendingName}
            onChange={(event) => setPendingName(event.target.value)}
            placeholder="Enter your dog's name"
          />
          <button type="button" className="action-button" onClick={savePetName}>
            Save name and continue
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'tutorial') {
    const step = tutorialSteps[tutorialStep]
    return (
      <div className="app-shell tutorial-screen">
        <section className="hero-card">
          <div className="hero-avatar">🐶</div>
          <div className="hero-info">
            <h1>{petName}'s Tutorial</h1>
            <p>Learn the basics before you start playing.</p>
          </div>
        </section>
        <div className="card-panel">
          <h2>{step.title}</h2>
          <p>{step.text}</p>
          <div className="tutorial-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setTutorialStep((step) => Math.max(0, step - 1))}
              disabled={tutorialStep === 0}
            >
              Back
            </button>
            <button type="button" className="action-button" onClick={advanceTutorial}>
              {tutorialStep === tutorialSteps.length - 1 ? 'Finish tutorial' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-avatar" aria-hidden="true">🐶</div>
        <div className="hero-info">
          <h1>{petName}'s Home</h1>
          <p>Take care of your dog with daily actions and mini-games.</p>
        </div>
        <div className="score-card">
          <div className="score-pill">{points} points</div>
        </div>
      </header>

      {poopVisible && (
        <div className="poop-banner">
          <span>💩 Poop appeared! Clean it before your dog gets unhappy.</span>
          <button type="button" className="ghost-button" onClick={cleanPoop}>
            Clean Poop
          </button>
        </div>
      )}

      <section className="status-panel">
        <div className="status-block">
          <div className="status-label">Satisfaction</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${satisfaction}%` }} />
          </div>
          <div className="status-value">{satisfaction}%</div>
        </div>
        <div className="status-block mini-game-summary">
          <div className="status-label">Current game</div>
          <div className="game-mode">
            {gameMode === 'none' ? 'No game active' : gameMode === 'treat' ? 'Treat Toss' : 'Frisbee Catch'}
          </div>
          <div className="message-box">{message}</div>
        </div>
      </section>

      <main className="game-grid">
        <section className="tasks-panel">
          <div className="panel-header">
            <h2>Daily Tasks</h2>
            <button type="button" className="ghost-button" onClick={resetDay}>
              Reset Day
            </button>
          </div>
          <div className="task-list">
            {actions.map((action) => {
              const count = tasks[action.key]
              const target = action.target
              const isDisabled =
                action.key === 'feed'
                  ? !isFeedAvailable
                  : action.key === 'walk'
                  ? !isWalkAvailable
                  : !isSpaAvailable
              const cooldownText =
                action.key === 'feed' && !isFeedAvailable
                  ? formatTimeRemaining(feedCooldown)
                  : action.key === 'walk' && !isWalkAvailable
                  ? formatTimeRemaining(walkCooldown)
                  : action.key === 'spa' && !isSpaAvailable
                  ? formatTimeRemaining(spaCooldown)
                  : ''

              return (
                <div key={action.key} className="task-item">
                  <div>
                    <strong>{action.label}</strong>
                    <p>{action.description}</p>
                  </div>
                  <div className="task-controls">
                    <div>
                      <span>
                        {count}/{target}
                      </span>
                      {cooldownText && <div className="cooldown-text">{cooldownText}</div>}
                    </div>
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => completeAction(action)}
                      disabled={isDisabled}
                    >
                      {count >= target ? 'Done' : action.label}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mini-games-panel">
          <h2>Mini Games</h2>
          <div className="game-actions">
            <button type="button" className="action-button" onClick={startTreatGame}>
              Start Treat Toss
            </button>
            <button type="button" className="action-button" onClick={startFrisbeeGame}>
              Start Frisbee Catch
            </button>
          </div>

          <div className="game-play">
            {gameMode === 'treat' && (
              <>
                <p>Click the treat button exactly {treatGoal} times.</p>
                <button type="button" className="action-button" onClick={playTreat}>
                  Toss Treat
                </button>
                <p>Clicks: {treatClicks}/{treatGoal}</p>
              </>
            )}
            {gameMode === 'frisbee' && (
              <>
                <p>Catch the frisbee {frisbeeGoal} times.</p>
                <button type="button" className="action-button" onClick={playFrisbee}>
                  Catch Frisbee
                </button>
                <p>Clicks: {frisbeeClicks}/{frisbeeGoal}</p>
              </>
            )}
            {gameMode === 'none' && (
              <p>Choose a mini-game to earn bonus points and boost happiness.</p>
            )}
            {!poopVisible && (
              <p className="small-note">
                Next random clean-up event in {formatTimeRemaining(Math.max(0, nextPoopAt - timeNow))}.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
