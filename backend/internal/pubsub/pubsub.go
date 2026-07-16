package pubsub

import (
	"sync"
)

type Event struct {
	Type    string
	Payload interface{}
}

type PubSub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan Event]struct{}
}

func New() *PubSub {
	return &PubSub{
		subscribers: make(map[string]map[chan Event]struct{}),
	}
}

func (ps *PubSub) Subscribe(topic string) <-chan Event {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	ch := make(chan Event, 1)
	if _, ok := ps.subscribers[topic]; !ok {
		ps.subscribers[topic] = make(map[chan Event]struct{})
	}
	ps.subscribers[topic][ch] = struct{}{}
	return ch
}

func (ps *PubSub) Unsubscribe(topic string, ch <-chan Event) {
	ps.mu.Lock()
	defer ps.mu.Unlock()

	if subs, ok := ps.subscribers[topic]; ok {
		for subCh := range subs {
			if subCh == ch {
				delete(subs, subCh)
				close(subCh)
				break
			}
		}
	}
}

func (ps *PubSub) Publish(topic string, event Event) {
	ps.mu.RLock()
	defer ps.mu.RUnlock()

	if subs, ok := ps.subscribers[topic]; ok {
		for ch := range subs {
			// Non-blocking send
			select {
			case ch <- event:
			default:
			}
		}
	}
}
