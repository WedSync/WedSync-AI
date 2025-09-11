import React from 'react';

interface WeddingCardProps {
  title: string;
  date: string;
  venue: string;
  couple: string;
}

export const WeddingCard: React.FC<WeddingCardProps> = ({
  title,
  date,
  venue,
  couple
}) => {
  return (
    <div className="WeddingCard">
      <h3>{title}</h3>
      <p className="date">{date}</p>
      <p className="venue">{venue}</p>
      <p className="couple">{couple}</p>
    </div>
  );
};

export default WeddingCard;