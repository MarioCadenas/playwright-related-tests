import Counter from "../Counter/Counter";
import homeIcon from '../../assets/images/home.png';

const Home = () =>{
  return (
    <>
    	<img src={homeIcon} alt='profile' style={{width: '200px'}}/>
      <h1>Home Page</h1>
      <Counter/>
    </>
  )
};

export default Home;