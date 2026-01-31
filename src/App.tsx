import './App.css';
import { CourseCard } from './course-card.component';

function App() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 m-20">
      {[
        'blue',
        'teal',
        'violet',
        'pink',
        'red',
        'orange',
        'yellow',
        'lime',
        'green',
      ].map((color) => (
        <CourseCard
          title="Структуры данных и алгоритмы. Анализ сложности алгоритмов"
          courseId="some-uuid"
          color={color}
          iconName="code"
          teachers={[
            {
              lastName: 'Батраева',
              firstName: 'Инна',
              patronymic: 'Александровна',
              username: 'inna_batraeva',
            },
            {
              lastName: 'Сафрончик',
              firstName: 'Мария',
              patronymic: 'Ильинична',
              username: 'maria_safronchik',
            },
          ]}
        />
      ))}
    </div>
  );
}

export default App;
