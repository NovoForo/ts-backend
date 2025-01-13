function getSentimentScores(results: any): any {
    const scores = {};
  
    results.forEach((result: any) => {
      const { label, score } = result;
      if (label === 'POSITIVE' || label === 'NEGATIVE') {
        scores[label] = score;
      }
    });
  
    return scores;
}

export default getSentimentScores;