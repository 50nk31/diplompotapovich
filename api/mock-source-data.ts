export interface DemoVacancyTemplate {
  externalId: string;
  title: string;
  company: string;
  location: string;
  specialty: string;
  salaryText: string;
  salaryMin: number;
  salaryMax: number;
  employmentType: string;
  summary: string;
  description: string;
}

export const demoSources = [
  {
    name: "Headway Jobs",
    baseUrl: "https://headway.example/jobs",
    specialty: "Frontend-разработка",
    region: "Москва",
    successRate: 97,
    responseTimeMs: 820,
  },
  {
    name: "North Talent",
    baseUrl: "https://northtalent.example/vacancies",
    specialty: "Data-аналитика",
    region: "Санкт-Петербург",
    successRate: 93,
    responseTimeMs: 1050,
  },
  {
    name: "Volga Career",
    baseUrl: "https://volgacareer.example/openings",
    specialty: "Системное администрирование",
    region: "Казань",
    successRate: 89,
    responseTimeMs: 1180,
  },
];

export const demoTemplates: DemoVacancyTemplate[] = [
  {
    externalId: "fj-001",
    title: "Frontend-разработчик TypeScript",
    company: "Северный Контур",
    location: "Москва",
    specialty: "Frontend-разработка",
    salaryText: "180 000 - 230 000 ₽",
    salaryMin: 180000,
    salaryMax: 230000,
    employmentType: "Полная занятость",
    summary: "Разработка внутренних интерфейсов мониторинга и аналитических панелей.",
    description:
      "Нужен специалист для развития клиентских интерфейсов, работы с TypeScript, API и интерактивной визуализацией данных.",
  },
  {
    externalId: "fj-002",
    title: "Веб-разработчик интерфейсов данных",
    company: "Речной Проект",
    location: "Нижний Новгород",
    specialty: "Frontend-разработка",
    salaryText: "160 000 - 210 000 ₽",
    salaryMin: 160000,
    salaryMax: 210000,
    employmentType: "Гибрид",
    summary: "Поддержка интерфейсов поиска и фильтрации по большим массивам данных.",
    description:
      "Обязанности включают разработку таблиц, фильтров, отчетов и компонентов визуального контроля состояния данных.",
  },
  {
    externalId: "da-101",
    title: "Аналитик вакансий и рынка труда",
    company: "Баланс Данных",
    location: "Санкт-Петербург",
    specialty: "Data-аналитика",
    salaryText: "150 000 - 190 000 ₽",
    salaryMin: 150000,
    salaryMax: 190000,
    employmentType: "Полная занятость",
    summary: "Подготовка аналитических сводок по спросу и активности работодателей.",
    description:
      "Требуется опыт работы с SQL, статистикой и визуализацией показателей по динамике вакансий и рынку труда.",
  },
  {
    externalId: "da-102",
    title: "BI-аналитик кадровых показателей",
    company: "Фактор Групп",
    location: "Екатеринбург",
    specialty: "Data-аналитика",
    salaryText: "170 000 - 220 000 ₽",
    salaryMin: 170000,
    salaryMax: 220000,
    employmentType: "Удаленно",
    summary: "Разработка витрин данных и аналитических отчетов для кадровых команд.",
    description:
      "Нужен аналитик для построения показателей, подготовки срезов по регионам и сопровождения BI-панелей.",
  },
  {
    externalId: "sa-201",
    title: "Системный администратор Linux",
    company: "Инфосеть",
    location: "Казань",
    specialty: "Системное администрирование",
    salaryText: "140 000 - 175 000 ₽",
    salaryMin: 140000,
    salaryMax: 175000,
    employmentType: "Полная занятость",
    summary: "Поддержка серверной инфраструктуры и контроль надежности сервисов.",
    description:
      "Необходим опыт администрирования Linux, резервного копирования, логирования и мониторинга эксплуатационных систем.",
  },
  {
    externalId: "sa-202",
    title: "Инженер сопровождения инфраструктуры",
    company: "Орбита Сервис",
    location: "Самара",
    specialty: "Системное администрирование",
    salaryText: "135 000 - 165 000 ₽",
    salaryMin: 135000,
    salaryMax: 165000,
    employmentType: "Сменный график",
    summary: "Поддержка корпоративных систем, сетевых узлов и внутренних сервисов.",
    description:
      "Задачи включают анализ инцидентов, контроль резервных копий и сопровождение серверов и сетевой инфраструктуры.",
  },
];
