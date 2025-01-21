import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <>
      <h2>Counter</h2>
      <div style={{ margin: '8px' }}>
        <button onClick={() => setCount((count) => count - 1)}>-</button>
        <span style={{ margin: '8px' }}>{count}</span>
        <button onClick={() => setCount((count) => count + 1)}>+</button>
      </div>
    </>
  );
};

export default Counter;
