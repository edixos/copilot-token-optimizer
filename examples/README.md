# Framework Examples

Framework-specific setup examples with common patterns, mistakes, and best practices.

---

## Available Examples

### [Express.js](express.md)

**For**: REST APIs with Express.js

**Includes**:
- Express routing and middleware patterns
- API design best practices
- Database connection patterns
- Error handling strategies
- Common mistakes to avoid

**Use when building**: REST APIs, microservices, backend services

---

### [Next.js](nextjs.md)

**For**: React applications with Next.js

**Includes**:
- App Router vs Pages Router patterns
- Server vs Client component patterns
- Data fetching strategies
- API routes organization
- Routing and navigation
- Common mistakes to avoid

**Use when building**: Web applications, JAMstack sites, full-stack React apps

---

### [Vue.js](vue.md)

**For**: Vue.js applications

**Includes**:
- Composition API patterns (Vue 3+)
- Component communication (props/emits)
- State management with Pinia
- Vue Router patterns
- Testing with Vitest
- Common mistakes to avoid

**Use when building**: SPAs, progressive web apps, modern Vue applications

---

### [Nuxt.js](nuxtjs.md)

**For**: Nuxt.js (Vue) applications

**Includes**:
- Server-side rendering and data fetching
- File-based routing and layouts
- Auto-imports and composables
- Server routes and API endpoints
- useState and Pinia patterns
- Common mistakes to avoid

**Use when building**: Full-stack Vue apps, SSR apps, static sites, universal applications

---

### [Angular](angular.md)

**For**: Angular applications

**Includes**:
- Standalone components (Angular 17+)
- Signals and reactive state
- Dependency injection patterns
- RxJS and observables
- Route guards and resolvers
- Common mistakes to avoid

**Use when building**: Enterprise applications, TypeScript-first projects

---

### [Django](django.md)

**For**: Django (Python) applications

**Includes**:
- Django ORM and QuerySet optimization
- Class-based vs function-based views
- Django REST Framework patterns
- Forms and validation
- Testing with pytest
- Common mistakes to avoid

**Use when building**: Web applications, REST APIs, CMS systems

---

### [Ruby on Rails](rails.md)

**For**: Rails applications

**Includes**:
- ActiveRecord associations and queries
- RESTful controller patterns
- Hotwire (Turbo + Stimulus)
- Background jobs with Sidekiq
- RSpec testing patterns
- Common mistakes to avoid

**Use when building**: Full-stack web applications, MVPs, CRUD apps

---

### [NestJS](nestjs.md)

**For**: NestJS (Node.js) applications

**Includes**:
- Module organization and dependency injection
- Controllers, guards, interceptors, pipes
- TypeORM and Prisma patterns
- Testing with Jest (unit, integration, e2e)
- Exception handling and validation
- Common mistakes to avoid

**Use when building**: Enterprise Node.js APIs, microservices, TypeScript projects

---

### [Laravel](laravel.md)

**For**: Laravel (PHP) applications

**Includes**:
- Eloquent ORM and query optimization
- Resource controllers and routes
- API resources and transformations
- Form requests and validation
- PHPUnit/Pest testing patterns
- Common mistakes to avoid

**Use when building**: PHP web applications, REST APIs, CMS systems

---

### [FastAPI / Flask](fastapi.md)

**For**: Python web APIs with FastAPI or Flask

**Includes**:
- FastAPI routing and dependency injection
- Pydantic v2 models and validators
- Async SQLAlchemy patterns
- pytest fixtures and database cleanup
- Common mistakes to avoid

**Use when building**: Python REST APIs, async web services, data APIs

---

### [Go (Gin/chi)](go.md)

**For**: Go web services

**Includes**:
- Router setup and middleware chains
- Handler patterns and error handling
- Context and request lifecycle
- Testing with testify
- Common mistakes to avoid

**Use when building**: Go APIs, microservices, high-performance backends

---

### [Spring Boot](spring-boot.md)

**For**: Java REST APIs with Spring Boot

**Includes**:
- Controller, service, and repository layers
- JPA and database patterns
- Spring Security basics
- Testing with JUnit and Mockito
- Common mistakes to avoid

**Use when building**: Java microservices, enterprise REST APIs, Spring applications

---

### [Svelte / SvelteKit](svelte.md)

**For**: Svelte applications with SvelteKit

**Includes**:
- SvelteKit routing and load functions
- Reactive stores and state management
- Form actions and progressive enhancement
- SSR and CSR patterns
- Common mistakes to avoid

**Use when building**: Full-stack Svelte apps, static sites, modern web applications

---

## How to Use

1. **Start with Universal Setup**
   - Copy and use `UNIVERSAL_SETUP.md` first
   - This creates the base structure

2. **Apply Framework Example**
   - After universal setup completes
   - Say: "Also apply the [Express/Next.js] patterns"
   - Copilot customizes for your framework

3. **Result**
   - Framework-specific common mistakes
   - Framework-specific learnings files
   - Framework-specific quick reference

---

## Contributing New Examples

Want to add a framework? See `CONTRIBUTING.md`

**Needed examples:**
- Rust (Actix / Axum)
- Phoenix (Elixir)
- ASP.NET Core

---

## Token Savings by Framework

| Framework | Before | After | Savings |
|-----------|--------|-------|---------|
| Express | ~10,000 | ~1,300 | 87% |
| Next.js | ~9,000 | ~1,400 | 84% |
| Vue.js | ~9,500 | ~1,500 | 84% |
| Nuxt.js | ~9,500 | ~1,500 | 84% |
| Angular | ~10,500 | ~1,500 | 86% |
| Django | ~11,000 | ~1,800 | 84% |
| Rails | ~10,000 | ~1,700 | 83% |
| NestJS | ~11,500 | ~1,900 | 83% |
| Laravel | ~10,500 | ~1,800 | 83% |
| FastAPI / Flask | ~9,000 | ~1,500 | 83% |
| Go | ~8,500 | ~1,400 | 84% |
| Spring Boot | ~10,000 | ~1,700 | 83% |
| Svelte / SvelteKit | ~8,500 | ~1,400 | 84% |

---

**Last Updated**: 2026-05-20
