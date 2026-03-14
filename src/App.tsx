import InfiniteCanvas from "./components/infinity-canvas"
import Nav from "./components/nav"

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main"
        className="absolute left-4 top-4 z-[100] -translate-y-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to canvas
      </a>
      <Nav />
      <main id="main" className="flex flex-1 flex-col" aria-label="Canvas workspace">
        <InfiniteCanvas />
      </main>
    </div>
  )
}

export default App
