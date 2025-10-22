import { useEffect, useRef, useState } from "react";

const WAIT_DURATION = 2000; // 2초 대기 (짧은 텍스트)
const ANIMATION_DURATION = 8000; // 8초 동안 마키 (긴 텍스트)
const ANIMATION_DELAY = 500; // 0.5초 지연

interface UseNewsAnimationProps {
  currentIndex: number;
  onNextSlide: () => void;
}

export const useNewsAnimation = ({
  currentIndex,
  onNextSlide,
}: UseNewsAnimationProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction] = useState<"enter" | "exit">("enter");
  const textRef = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimer = useRef<number | null>(null);
  const animationEndHandler = useRef<(() => void) | null>(null);

  const checkOverflow = () => {
    if (textRef.current && containerRef.current) {
      // DOM이 완전히 렌더링될 때까지 잠시 대기
      setTimeout(() => {
        if (textRef.current && containerRef.current) {
          const textWidth = textRef.current.scrollWidth;
          const containerWidth = containerRef.current.clientWidth;
          const isOverflowing = textWidth > containerWidth;

          if (isOverflowing) {
            // 직접 transform을 사용하여 마키 애니메이션 구현
            const moveDistance = textWidth - containerWidth + 30; // 30px 여백

            // 애니메이션을 위한 CSS 클래스 동적 생성
            const style = document.createElement("style");
            style.textContent = `
              @keyframes marquee-${currentIndex} {
                0% { transform: translateX(0); }
                20% { transform: translateX(0); }
                80% { transform: translateX(-${moveDistance}px); }
                100% { transform: translateX(-${moveDistance}px); }
              }
              .marquee-${currentIndex} {
                animation: marquee-${currentIndex} 8s linear;
                animation-delay: 0.5s;
                animation-fill-mode: both;
              }
            `;
            document.head.appendChild(style);

            // 긴 텍스트의 경우 마키 애니메이션 시작
            setIsAnimating(true);

            // 기존 이벤트 리스너 제거
            if (animationEndHandler.current && textRef.current) {
              textRef.current.removeEventListener(
                "animationend",
                animationEndHandler.current,
              );
            }

            // 애니메이션 완료 이벤트 리스너 추가
            animationEndHandler.current = () => {
              if (textRef.current && animationEndHandler.current) {
                textRef.current.removeEventListener(
                  "animationend",
                  animationEndHandler.current,
                );
              }
              // 애니메이션 완료 후 1초 대기 후 다음 슬라이드로
              setTimeout(() => {
                onNextSlide();
              }, 1000);
            };

            if (textRef.current && animationEndHandler.current) {
              textRef.current.addEventListener(
                "animationend",
                animationEndHandler.current,
              );
            }

            // 백업 타이머 (애니메이션이 제대로 작동하지 않을 경우를 대비)
            if (animationTimer.current) {
              clearTimeout(animationTimer.current);
            }
            animationTimer.current = window.setTimeout(
              () => {
                onNextSlide();
              },
              ANIMATION_DELAY + ANIMATION_DURATION + 2000,
            );
          } else {
            // 짧은 텍스트의 경우 정적 표시 후 다음 슬라이드로
            setIsAnimating(false);
            if (animationTimer.current) {
              clearTimeout(animationTimer.current);
            }
            animationTimer.current = window.setTimeout(() => {
              onNextSlide();
            }, WAIT_DURATION * 2);
          }
        }
      }, 100);
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);

    return () => {
      window.removeEventListener("resize", checkOverflow);
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
      // 애니메이션 이벤트 리스너 정리
      if (animationEndHandler.current && textRef.current) {
        textRef.current.removeEventListener(
          "animationend",
          animationEndHandler.current,
        );
      }
    };
  }, [currentIndex]);

  useEffect(() => {
    const timer = setTimeout(checkOverflow, 200);
    return () => clearTimeout(timer);
  }, [direction]);

  return {
    isAnimating,
    direction,
    textRef,
    containerRef,
  };
};
