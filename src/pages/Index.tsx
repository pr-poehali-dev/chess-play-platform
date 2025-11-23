import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

const AUTH_API = 'https://functions.poehali.dev/ec1c5f00-a00d-4a21-b3ef-79bb6f4a7e80';

interface User {
  id: number;
  username: string;
  email: string;
  rating: number;
  games_played: number;
  games_won: number;
  games_drawn: number;
}

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

const initialBoard: (Piece | null)[][] = [
  [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'rook', color: 'black' }
  ],
  Array(8).fill({ type: 'pawn', color: 'black' }),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill({ type: 'pawn', color: 'white' }),
  [
    { type: 'rook', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' }
  ]
];

export default function Index() {
  const [activeSection, setActiveSection] = useState('home');
  const [board, setBoard] = useState(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [user, setUser] = useState<User | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isGameActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!isGameActive) return;

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;
      const piece = board[selectedRow][selectedCol];
      
      if (piece && piece.color === currentPlayer) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = piece;
        newBoard[selectedRow][selectedCol] = null;
        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
      }
      setSelectedSquare(null);
    } else {
      const piece = board[row][col];
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare([row, col]);
      }
    }
  };

  const startGame = () => {
    if (!user) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите или зарегистрируйтесь для игры',
        variant: 'destructive'
      });
      setShowAuthDialog(true);
      return;
    }
    setBoard(initialBoard);
    setTimeLeft(300);
    setIsGameActive(true);
    setCurrentPlayer('white');
    setSelectedSquare(null);
    setActiveSection('play');
  };

  const handleAuth = async () => {
    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: authForm.username,
          email: authMode === 'register' ? authForm.email : undefined,
          password: authForm.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Ошибка',
          description: data.error || 'Произошла ошибка',
          variant: 'destructive'
        });
        return;
      }

      setUser(data.user);
      setShowAuthDialog(false);
      setAuthForm({ username: '', email: '', password: '' });
      toast({
        title: 'Успешно',
        description: authMode === 'login' ? 'Вы вошли в систему' : 'Регистрация завершена'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    toast({
      title: 'Выход',
      description: 'Вы вышли из системы'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-4xl">♟️</div>
              <h1 className="text-2xl font-bold text-foreground">ChessMaster</h1>
            </div>
            
            <div className="hidden md:flex gap-6">
              {['home', 'play', 'tournaments', 'rating', 'profile'].map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`capitalize transition-colors ${
                    activeSection === section
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {section === 'home' ? 'Главная' : 
                   section === 'play' ? 'Играть' :
                   section === 'tournaments' ? 'Турниры' :
                   section === 'rating' ? 'Рейтинг' : 'Профиль'}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{user.username}</span>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  <Icon name="LogOut" size={16} />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowAuthDialog(true)}>
                <Icon name="User" size={16} className="mr-2" />
                Войти
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        {activeSection === 'home' && (
          <div className="space-y-16 animate-fade-in">
            <section className="text-center space-y-6 py-12">
              <div className="inline-block text-8xl mb-4">♟️</div>
              <h2 className="text-5xl md:text-6xl font-bold text-foreground">
                Играй в шахматы онлайн
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Быстрые партии с ограниченным временем. Развивай стратегическое мышление и соревнуйся с игроками со всего мира
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button size="lg" onClick={startGame} className="text-lg px-8">
                  <Icon name="Play" className="mr-2" size={20} />
                  Быстрая игра
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Icon name="Users" className="mr-2" size={20} />
                  Турниры
                </Button>
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 space-y-3 hover-scale">
                <div className="text-4xl">⚡</div>
                <h3 className="text-xl font-semibold">Быстрые партии</h3>
                <p className="text-muted-foreground">
                  Партии на 3-5 минут для динамичной игры
                </p>
              </Card>
              
              <Card className="p-6 space-y-3 hover-scale">
                <div className="text-4xl">🏆</div>
                <h3 className="text-xl font-semibold">Турниры</h3>
                <p className="text-muted-foreground">
                  Участвуйте в соревнованиях и выигрывайте призы
                </p>
              </Card>
              
              <Card className="p-6 space-y-3 hover-scale">
                <div className="text-4xl">📊</div>
                <h3 className="text-xl font-semibold">Рейтинг</h3>
                <p className="text-muted-foreground">
                  Отслеживайте свой прогресс и статистику
                </p>
              </Card>
            </section>
          </div>
        )}

        {activeSection === 'play' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Быстрая партия</h2>
              <div className="flex items-center gap-4">
                <Card className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Clock" size={20} />
                    <span className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</span>
                  </div>
                </Card>
                {!isGameActive && (
                  <Button onClick={startGame}>
                    <Icon name="Play" className="mr-2" size={16} />
                    Начать игру
                  </Button>
                )}
              </div>
            </div>

            {isGameActive && (
              <Card className="p-4 bg-accent/50">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${currentPlayer === 'white' ? 'bg-white border-2 border-foreground' : 'bg-foreground'}`} />
                  <span className="font-semibold">
                    Ход: {currentPlayer === 'white' ? 'Белые' : 'Чёрные'}
                  </span>
                </div>
              </Card>
            )}

            <Card className="p-8 bg-gradient-to-br from-[#3E2723] to-[#2C1810]">
              <div className="grid grid-cols-8 gap-0 w-full max-w-[600px] mx-auto aspect-square border-4 border-[#8B6F47] shadow-2xl">
                {board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isSelected = selectedSquare?.[0] === rowIndex && selectedSquare?.[1] === colIndex;
                    
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        className={`
                          aspect-square flex items-center justify-center text-5xl font-bold
                          transition-all duration-200
                          ${isLight ? 'bg-[#D7CCC8]' : 'bg-[#8D6E63]'}
                          ${isSelected ? 'ring-4 ring-primary ring-inset' : ''}
                          ${isGameActive ? 'hover:brightness-110 cursor-pointer' : 'cursor-not-allowed opacity-70'}
                        `}
                      >
                        {piece && pieceSymbols[piece.color][piece.type]}
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-foreground" />
                  Белые
                </h3>
                <p className="text-sm text-muted-foreground">Рейтинг: 1420</p>
              </Card>
              
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-foreground" />
                  Чёрные
                </h3>
                <p className="text-sm text-muted-foreground">Рейтинг: 1380</p>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'tournaments' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">Турниры</h2>
            
            <div className="space-y-4">
              {[
                { name: 'Блиц-турнир выходного дня', players: 128, prize: '10 000 ₽', time: 'Сегодня 18:00' },
                { name: 'Еженедельный чемпионат', players: 256, prize: '25 000 ₽', time: 'Суббота 15:00' },
                { name: 'Открытый турнир для новичков', players: 64, prize: '5 000 ₽', time: 'Завтра 20:00' }
              ].map((tournament, index) => (
                <Card key={index} className="p-6 hover-scale">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{tournament.name}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="Users" size={16} />
                          {tournament.players} игроков
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Trophy" size={16} />
                          {tournament.prize}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" size={16} />
                          {tournament.time}
                        </span>
                      </div>
                    </div>
                    <Button>Участвовать</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'rating' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">Рейтинг игроков</h2>
            
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent">
                    <tr>
                      <th className="px-6 py-4 text-left">Место</th>
                      <th className="px-6 py-4 text-left">Игрок</th>
                      <th className="px-6 py-4 text-left">Рейтинг</th>
                      <th className="px-6 py-4 text-left">Партий</th>
                      <th className="px-6 py-4 text-left">Побед</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { place: 1, name: 'GrandMaster2024', rating: 2450, games: 1250, wins: '68%' },
                      { place: 2, name: 'ChessKing', rating: 2380, games: 980, wins: '65%' },
                      { place: 3, name: 'StrategicMind', rating: 2340, games: 1100, wins: '64%' },
                      { place: 4, name: 'RookMaster', rating: 2290, games: 890, wins: '62%' },
                      { place: 5, name: 'QueenGambit', rating: 2250, games: 1050, wins: '61%' }
                    ].map((player) => (
                      <tr key={player.place} className="border-b border-border hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-4 font-semibold">{player.place}</td>
                        <td className="px-6 py-4">{player.name}</td>
                        <td className="px-6 py-4 font-bold text-primary">{player.rating}</td>
                        <td className="px-6 py-4">{player.games}</td>
                        <td className="px-6 py-4">{player.wins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-3xl font-bold">Профиль</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-3xl">
                  ♟️
                </div>
                <h3 className="text-xl font-semibold">{user?.username || 'Guest'}</h3>
                <p className="text-muted-foreground">Рейтинг: {user?.rating || 1200}</p>
              </Card>

              <Card className="p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="BarChart" size={20} />
                  Статистика
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Партий сыграно:</span>
                    <span className="font-semibold">{user?.games_played || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Побед:</span>
                    <span className="font-semibold text-green-500">{user?.games_won || 0} ({user && user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ничьих:</span>
                    <span className="font-semibold">{user?.games_drawn || 0} ({user && user.games_played > 0 ? Math.round((user.games_drawn / user.games_played) * 100) : 0}%)</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Icon name="Trophy" size={20} />
                  Достижения
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥇</span>
                    <span className="text-sm">Первая победа</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span className="text-sm">Блиц-мастер</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    <span className="text-sm">100 партий</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 ChessMaster. Играй, учись, побеждай</p>
        </div>
      </footer>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authMode === 'login' ? 'Вход' : 'Регистрация'}</DialogTitle>
            <DialogDescription>
              {authMode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                placeholder="username123"
              />
            </div>
            
            {authMode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            
            <Button onClick={handleAuth} className="w-full">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {authMode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}