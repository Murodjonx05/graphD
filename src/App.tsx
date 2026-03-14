import InfiniteCanvas from "./components/infinity-canvas"
import Nav from "./components/nav"

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Nav />
      <InfiniteCanvas />
    </div>
  )
}

export default App
