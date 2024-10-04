import React from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Input, VStack, Text, Icon, Flex, Divider } from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Papa from "papaparse";
import Output from "./output";

const Filtering = () => {
  // 前の画面から渡された状態を取得
  const location = useLocation();
  // 前の画面の情報を代入する 
  const answers = location.state || {};
  const navigate = useNavigate(); // 戻るボタン用


  const [csvData, setCsvData] = useState('');
  const [data, setData] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [responseOutput, setResponseOutput] = useState('');
  useEffect(() => {
    // CSVファイルを読み込む
    const fetchData = async () => {
      const response = await fetch("/companies.csv"); // public/A.csvを読み込み
      const reader = response.body.getReader();
      const result = await reader.read(); // rawデータを取得
      const decoder = new TextDecoder("utf-8");
      const csvData = decoder.decode(result.value); // CSVデータを文字列に変換

      // PapaParseでCSVをパース
      Papa.parse(csvData, {
        header: true, // 1行目をヘッダーとして使用
        complete: (results) => {
          setData(results.data); // CSVデータをステートに格納
          console.log(results.data);
        },
      });
    };
    fetchData();
  }, []);

    // useEffect(() => {
    //   // CSVファイルをfetchで取得
    //   fetch('/companies.csv')
    //     .then(response => response.text())
    //     .then(data => {
    //       setCsvData(data); // CSVデータをstateにセット
    //        console.log(data); // コンソールに表示
    //     })
    //     .catch(error => console.error('エラー:', error));
    // }, []);
  
    // フィルタリング関数
    const filterData = () => {
      return data.filter((row) => {
        const overtime = row["残業時間（月平均）"] ? row["残業時間（月平均）"].replace("時間", "") : "0"; // Add a fallback value
        const salary = row["平均年収"] ? row["平均年収"].replace("万", "") : "0"; // Ensure the salary exists
    
        console.log(parseInt(overtime));
        if (answers.remoteWork === "いいえ" || answers.remoteWork === "" || row["リモートワーク"] === answers.remoteWork) {
          console.log("リモート");
        }
        if (answers.industry === "特になし" || answers.industry === "" || row["業界"] === answers.industry) {
          console.log("業界");
        }
        if (answers.flex === "" || row["フレックス制度"] === answers.flex) {
          console.log("業界");
        }
        return (
          (answers.remoteWork === "なし" || answers.remoteWork === "" || row["リモートワーク"] === answers.remoteWork)  &&
          (answers.industry === "特になし" || answers.industry === "" || row["業界"] === answers.industry)  &&
          (answers.salary === "" || parseInt(answers.salary) <= parseInt(salary) * 10000)   &&
          (answers.flex === "" || row["フレックス制度"] === answers.flex)  &&
          (answers.workingplace === "" || row["勤務地"] === answers.workingplace) &&
          (answers.newYearHoliday === "なし" || row["長期休暇"] === answers.newYearHoliday)   &&
          (answers.known === "" || row["知名度"] === answers.known)  &&
          (answers.overtime === "" || parseInt(answers.overtime) <= parseInt(overtime))  //&&
          //(answers.weekend === "なし" || answers.weekend === "" || row["weekend"] === answers.overtime)
        );
      });
    };
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    //console.log('API Key :', apiKey)
    //const apiKey = 'APIKEY';
  
  
  
    // APIにPOSTリクエストを送信する関数
    const callChatGPT = async (filteredCompanies, userCulturePreference) => {
      const prompt = `
        以下の会社からユーザーの社風の好みに合う２社を選んでください。 
        ユーザーの社風の好み: ${userCulturePreference}
        ユーザーの希望: ${userInput}
        会社のリスト:
        ${filteredCompanies.map(company => 
          `会社名: ${company["企業名"]}, 社風: ${company["社風"]}`
        ).join("\n")}
        
        社風がユーザーの好みに合いそうな２つの会社を選んで、その理由を150文字程度で説明してください。
      `;
    
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",  // Use the GPT model you want
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
          }),
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        return data.choices[0]?.message.content || 'No response from ChatGPT';
      } catch (error) {
        console.error('Error fetching data from OpenAI API:', error);
        throw new Error('Failed to fetch ChatGPT response');
      }
    };
    const handleSubmit = async (event) => {
      event.preventDefault(); // Prevent form default submission behavior
      setResponseOutput('応答を待っています...'); // Show waiting message
      try {
        const filteredCompanies = filterData(); // Get the filtered companies
        const response = await callChatGPT(filteredCompanies, answers.syahuu); // ChatGPT response with filtered companies and user preference
        setResponseOutput(response); // Save the response in state
      } catch (error) {
        console.error('Error:', error);
        setResponseOutput('エラーが発生しました。'); // Show error message
      }
    };
    
const filteredCompanies = filterData().map((row) => ({
  companyName: row["企業名"],
  industry: row["業界"],
  averageSalary: row["平均年収"],
}));

   // デバッグ用: フィルタリング結果をコンソールに出力
   console.log("remotework: ", answers.remoteWork);
   console.log("industry: ", answers.industry);
   console.log("salary: ", answers.salary);
   console.log("newyearholiday: ", answers.newYearHoliday);
   //console.log("Filtered Companies: ", filteredCompanyNames);
    
  // ページ遷移後の表示を作成
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" py={12} px={6} bgGradient="linear(to-r, teal.500, green.500)">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box
          p={8}
          maxW="lg"
          borderRadius="lg"
          boxShadow="2xl"
          w="full"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
        >
<VStack spacing={6} align="center">
          <h1>あなたにマッチする会社</h1>
          <ul>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company, index) => (
                <li key={index}>
                  <strong>企業名:</strong> {company.companyName} <br />
                  <strong>業界:</strong> {company.industry} <br />
                  <strong>平均年収:</strong> {company.averageSalary}万円
                </li>
              ))
            ) : (
              <li>条件に合う会社が見つかりませんでした。</li>
            )}
          </ul>
          <br></br> <br></br>

          </VStack>
          <VStack spacing={6} align="center">
            <Text fontSize="xl">このなかからあなたに合う企業を探す</Text>
            <form onSubmit={handleSubmit}>
              <Input
                placeholder="どのような企業がいいですか？"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                size="lg"
                mb={4}
                required
              />
              <Button colorScheme="teal" type="submit">
                送信
              </Button>
            </form>
            <Text fontSize="lg" fontWeight="bold">ChatGPTのおすすめ企業:</Text>
            <Text>{responseOutput}</Text> {/* APIからの応答を表示 */}
          </VStack>
                    {/* 戻るボタン */}
                    <Button
            colorScheme="teal"
            size="lg"
            onClick={() => navigate("/output")}
            mt={6}
            _hover={{ bg: "teal.400", transform: "scale(1.05)" }}
            transition="all 0.3s ease"
          >
            はじめから
          </Button>
        </Box>
      </motion.div>
    </Box>
  );
};


export default Filtering;