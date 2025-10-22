import { useState } from "react";

import { useNewsAnimation } from "./useNewsAnimation";

import s from "./style.module.scss";

const NEWS_ITEMS = [
  "김정은 덕에 친해진 이재명·트럼프… 유대감 형성 큰 성과 [美 전문가 평가]",
  "'내란 방조' 한덕수 전 총리, 오늘 구속 기로",
  "[미니 다큐]죽음의 '손배 폭탄' 막을 노란봉투법...20년 만에 국회 통과",
];

interface Props {
  articles: string[];
}

export default function News({ articles }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % articles.length);
  };

  const { isAnimating, direction, textRef, containerRef } = useNewsAnimation({
    currentIndex,
    onNextSlide: handleNextSlide,
  });

  return (
    <article className={s.news} ref={containerRef}>
      <div className={`${s.newsContainer} ${s[direction]}`}>
        <p
          ref={textRef}
          className={`${s.newsText} ${isAnimating ? `marquee-${currentIndex}` : ""}`}
          key={currentIndex}
        >
          {articles[currentIndex]}
        </p>
      </div>
    </article>
  );
}
