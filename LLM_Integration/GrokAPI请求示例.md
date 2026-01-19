HTTP版本:

curl "https://api.jiekou.ai/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR JIEKOU API Key>" \
  -d @- << 'EOF'
{
    "model": "grok-4-1-fast-reasoning",
    "messages": [
        {
            "role": "system",
            "content": "这里是系统提示词，你要写好变量。之后用户会从前端来切换预设来定义这个变量"
        },
        {
            "role": "user",
            "content": "Hi there!"
        }
    ],
    "response_format": { "type": "text" },
    "max_tokens": 1000000,
    "temperature": 1,
    "min_p": 0,
    "top_k": 50,
    "presence_penalty": 0,
    "frequency_penalty": 0,
    "repetition_penalty": undefined
}
EOF
  

PYTHON版本:

from openai import OpenAI
  
client = OpenAI(
    base_url="https://api.jiekou.ai/openai",
    api_key="<YOUR JIEKOU API Key>",
)

model = "grok-4-1-fast-reasoning"
stream = True # or False
max_tokens = 1000000
system_content = "这里是系统提示词，你要写好变量。之后用户会从前端来切换预设来定义这个变量"
temperature = 1
min_p = 0
top_k = 50
presence_penalty = 0
frequency_penalty = 0
repetition_penalty = undefined
response_format = { "type": "text" }

chat_completion_res = client.chat.completions.create(
    model=model,
    messages=[
        {
            "role": "system",
            "content": system_content,
        },
        {
            "role": "user",
            "content": "Hi there!",
        }
    ],
    stream=stream,
    max_tokens=max_tokens,
    temperature=temperature,
    presence_penalty=presence_penalty,
    frequency_penalty=frequency_penalty,
    response_format=response_format,
    extra_body={
      "top_k": top_k,
      "repetition_penalty": repetition_penalty,
      "min_p": min_p
    }
  )

if stream:
    for chunk in chat_completion_res:
        print(chunk.choices[0].delta.content or "", end="")
else:
    print(chat_completion_res.choices[0].message.content)
  
  

JavaScript版本:

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.jiekou.ai/openai",
  apiKey: "<YOUR JIEKOU API Key>",
});
const stream = true; // or false

async function run() {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "这里是系统提示词，你要写好变量。之后用户会从前端来切换预设来定义这个变量",
      },
      {
        role: "user",
        content: "Hi there!",
      },
    ],
    model: "grok-4-1-fast-reasoning",
    stream,
    response_format: { type: "text" },
    max_tokens: 1000000,
    temperature: 1,
    min_p: 0,
    top_k: 50,
    presence_penalty: 0,
    frequency_penalty: 0,
    repetition_penalty: undefined
  });

  if (stream) {
    for await (const chunk of completion) {
      if (chunk.choices[0].finish_reason) {
        console.log(chunk.choices[0].finish_reason);
      } else {
        console.log(chunk.choices[0].delta.content);
      }
    }
  } else {
    console.log(JSON.stringify(completion));
  }
}

run();
  
