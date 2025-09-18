# GitHub Copilot Instructions – NestJS Project

This is a **NestJS-based Node.js application** with TypeScript that follows modular architecture and best practices for
maintainability and scalability. Please follow these guidelines when contributing:

## Code Standards

### Required Before Each Commit

- Run `npm run lint` to ensure code follows project standards
- Make sure all modules follow NestJS modular architecture
- When adding new functionality, make sure you update the README
- Make sure that the repository structure documentation is correct and accurate in the Copilot Instructions file

### TypeScript and NestJS Patterns

- Use TypeScript interfaces/types for all DTOs, entities, and responses
- Follow NestJS Dependency Injection patterns — do not instantiate services manually
- Each feature must be placed in its own module (`controller`, `service`, `dto`, `entity`)
- Use DTOs with `class-validator` / `class-transformer` for input validation
- Controllers should only handle request/response logic, all business logic goes into services
- Services should be thin and respect the single-responsibility principle
- Use `HttpException` or custom exceptions for error handling
- Use `ConfigModule` for environment variables, do not hardcode sensitive data

### Styling and Formatting

- Follow consistent NestJS/TypeScript style enforced by ESLint and Prettier
- Use enums instead of string literals when possible
- Keep functions and services short, modular, and easy to maintain

## Development Flow

- Install dependencies: `npm install`
- Development server: `npm run start:dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Repository Structure

- `src/`: Application source code
    - `main.ts`: Application entry point
    - `app.module.ts`: Root module
    - `common/`: Shared logic (filters, interceptors, pipes, guards, utils)
    - `config/`: Configuration modules (env, database, etc.)
    - `modules/`: Domain modules (grouped by feature)
        - `user/`: Example feature module
            - `user.module.ts`
            - `user.controller.ts`
            - `user.service.ts`
            - `user.entity.ts`
            - `dto/` (DTOs for input validation)
- `README.md`: Project documentation

## Key Guidelines

1. Controllers must remain lightweight and only coordinate requests/responses
2. Services contain all business logic and must not depend directly on controllers
3. Use DTOs to validate all external input
4. Environment configuration must go through `ConfigModule`
5. Apply global pipes and filters for validation and error handling
6. Use guards and interceptors for authentication, authorization, and logging
7. Follow SOLID principles when designing services and modules
8. Use `Logger` instead of `console.log` for structured logging
9. Avoid circular dependencies by properly designing module boundaries
10. Keep architecture modular and scalable for future growth  
