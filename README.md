# YouTubby

A full-stack video sharing platform inspired by YouTube. Upload videos, stream them adaptively, search, comment, and subscribe to creators. Built with Next.js, React, and AWS.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![React](https://img.shields.io/badge/React-18-61DAFB)
![AWS](https://img.shields.io/badge/AWS-powered-FF9900)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Video upload**: Direct-to-S3 uploads using presigned URLs
- **Adaptive streaming**: HLS transcoding with AWS MediaConvert, delivered through CloudFront
- **Authentication**: Sign up, sign in, and social login with Amazon Cognito
- **Watch page**: Video player, view counts, likes, and descriptions
- **Comments**: Threaded comments on every video
- **Subscriptions**: Follow channels and view a personalized feed
- **Search**: Find videos and channels by title, tag, or creator
- **Channel pages**: Profile, banner, and a grid of uploaded videos
- **Responsive UI**: Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Auth | Amazon Cognito |
| Storage | Amazon S3 |
| Video processing | AWS MediaConvert, AWS Lambda, Amazon EventBridge |
| Delivery | Amazon CloudFront |
| Database | Amazon DynamoDB |
| Hosting | AWS Amplify or Vercel |
| Infrastructure as code | AWS CDK |

## Architecture

```
Browser (Next.js + React)
        |
        |-- Auth ----------> Cognito
        |
        |-- API routes ----> Lambda ----> DynamoDB
        |
        |-- Upload --------> S3 (raw bucket)
                                  |
                                  v
                          EventBridge trigger
                                  |
                                  v
                            MediaConvert (HLS)
                                  |
                                  v
                          S3 (processed bucket)
                                  |
                                  v
                         CloudFront ----> Viewer
```

1. A user uploads a video straight to the raw S3 bucket with a presigned URL.
2. S3 emits an event that triggers a Lambda function.
3. Lambda starts a MediaConvert job that produces HLS renditions and a thumbnail.
4. Processed files land in a second bucket served through CloudFront.
5. Video metadata is written to DynamoDB and the video goes live.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm, pnpm, or yarn
- An AWS account
- AWS CLI configured (`aws configure`)
- AWS CDK installed (`npm install -g aws-cdk`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/youtubby.git
cd youtubby

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# AWS
AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_REGION=us-east-1

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id

# S3 and CloudFront
S3_RAW_BUCKET=youtubby-raw-uploads
S3_PROCESSED_BUCKET=youtubby-processed-videos
NEXT_PUBLIC_CLOUDFRONT_URL=https://your-distribution.cloudfront.net

# DynamoDB
DYNAMODB_VIDEOS_TABLE=youtubby-videos
DYNAMODB_COMMENTS_TABLE=youtubby-comments
DYNAMODB_USERS_TABLE=youtubby-users
```

### Deploy AWS Infrastructure

```bash
cd infra
npm install
cdk bootstrap
cdk deploy
```

Copy the stack outputs into your `.env.local` file.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
youtubby/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Sign in and sign up pages
│   ├── watch/[id]/         # Video watch page
│   ├── channel/[handle]/   # Channel pages
│   ├── upload/             # Upload flow
│   ├── search/             # Search results
│   └── api/                # API route handlers
├── components/             # Reusable React components
│   ├── VideoCard.tsx
│   ├── VideoPlayer.tsx
│   ├── CommentSection.tsx
│   └── Navbar.tsx
├── lib/                    # AWS clients, helpers, and utilities
├── types/                  # Shared TypeScript types
├── infra/                  # AWS CDK stacks
├── lambda/                 # Lambda functions (transcoding trigger, etc.)
└── public/                 # Static assets
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the codebase |

## Roadmap

- [x] Project setup and AWS infrastructure
- [ ] Authentication with Cognito
- [ ] Video upload and transcoding pipeline
- [ ] Watch page with HLS playback
- [ ] Comments and likes
- [ ] Channels and subscriptions
- [ ] Search
- [ ] Watch history and recommendations
- [ ] Live streaming
- [ ] Creator analytics dashboard

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

**Owen Crandall**
[LinkedIn](https://www.linkedin.com/in/owen-crandall/)

## Disclaimer

YouTubby is an educational project and is not affiliated with or endorsed by YouTube or Google.