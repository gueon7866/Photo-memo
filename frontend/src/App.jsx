import './App.scss'
import { Routes, Route } from 'react-router-dom'
import AuthPanel from './components/AuthPanel'
import Landing from './pages/Landing'
function App() {

  return (
    <div className='page'>
      <Routes>
        <Route path='/' element={<Landing/>}/>
        <Route path='/admin/login' element={<AuthPanel/>}/>
      </Routes>
   
    </div>
  )
}

export default App
