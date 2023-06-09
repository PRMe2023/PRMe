const express = require('express');
const cors = require('cors'); // CORS 
const bodyParser = require("body-parser"); // 데이터 파싱
const mysql = require("mysql"); // DB
const bcrypt = require('bcrypt') // 비밀번호 해싱
const nodemailer = require("nodemailer"); // 메일
const dotenv = require('dotenv'); // 환경변수 관리
const jwt = require('jsonwebtoken'); // jwt
const cookieParser = require('cookie-parser'); // 쿠키
const app = express(); // espress 앱을 생성한다.
dotenv.config();
const axios = require('axios');

/* --------------------------- 카카오 로그인 ------------------------------- */

// kakao에서 전송한 access토큰을 잘 받았다면 성공메시지 콘솔 출력

app.post('/api/kakao-token', (req, res) => {

  // access_token을 사용하여 필요한 로직을 수행하고 응답을 처리합니다.
  // 예를 들어, access_token을 데이터베이스에 저장하거나 다른 API와 통신할 수 있습니다.
  // console.log('클라이언트에서 전송된 access_token:');
  // 처리 완료 후 클라이언트에 응답을 보냅니다.
  res.send('토큰을 성공적으로 받았습니다.');
});

/* --------------------------- 환경 설정 ------------------------------- */
app.listen(process.env.PORT, ()=>{
  console.log(`running on port ${process.env.PORT}`); // 포트번호는 .env에
});

// CORS 활성화
app.use(cors({ 
  origin: "http://localhost:3000", // 도메인 허용 옵션
  credentials: true, // 
})); 

// josn 형태로 데이터 파싱
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Cookie-parser 쿠키 구문 분석 설정
app.use(cookieParser());

// DB 연동
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "testdb",
  });


/* --------------------- 회원가입 / 로그인 처리 함수 --------------------- */
// [[ TEST ]] Get 요청 시 requested에 1이 저장되는 코드 (성공)
app.get("/", (req, res) => {
  const testSqlQuery = "INSERT INTO requested (rowno) VALUES (3)";
  db.query(testSqlQuery, (err, result) => {
    res.send("success!!!");
  });
});


// 회원가입 처리
app.post("/register", async(req, res) => { // 데이터 받아서 전송
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 이메일 유효성 검사를 위한 정규표현식
  const sendTest = { state: ""  };

  if (!name || !email || !password) { 
    sendTest.state = "빈칸 없이 채워주세요.";
    return res.json(sendTest);
  } else {
    // 비밀번호 길이 검사
    if (password.length < 5 || password.length > 12){
      sendTest.state = "비밀번호는 5~12자리로 설정하세요.";
      return res.json(sendTest);
    } else if(name.length > 10) {
      // 닉네임 길이 검사
      sendTest.state = "닉네임은 10자 이하로 설정하세요.";
      return res.json(sendTest);
    } else if (!emailRegex.test(email)) {
      // 이메일 유효성 검사
      sendTest.state = "유효한 이메일 주소를 입력해주세요.";
      return res.json(sendTest);
    } else {
      try {
        // 이메일 중복 검사
        db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
          if(err) throw err;
          if(result.length > 0) {
            sendTest.state = "이미 가입된 이메일 입니다.";
            return res.json(sendTest);
          } else {
            // 닉네임 중복 검사
            db.query("SELECT * FROM user WHERE name = ?", [name], function(err,result){
              if(err) throw err;
              if(result.length > 0) {
                sendTest.state = "중복된 닉네임 입니다.";
                return res.json(sendTest);
              } else {
                // 비밀번호 해싱
                const hasedPassword = bcrypt.hashSync(password, 10);
                // 회원가입
                db.query("INSERT INTO user (email, name, password) VALUES (?,?,?)", [email, name, hasedPassword]);
                sendTest.state = "가입 완료";
                return res.json(sendTest);
              }
            })
          }
        })
    } catch (error){
        sendTest.state = "오류가 발생했습니다.";
        return res.json(sendTest);
      }
    }
  };

});


// 로그인 처리
app.post("/login", (req, res) => { // 데이터 받아서 전송
  const email = req.body.email;
  const password = req.body.password;

  const sendData = { isLogin: "", name: "", accesstoken: "", refreshtoken: "" };

  if (!email || !password) { 
    sendData.isLogin = "빈칸 없이 채워주세요.";
    return res.json(sendData);
  } else {
    try{
      // 이메일 검사
      db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
        if (err) throw err;
        if (result.length > 0){ // 일치하는 이메일이 있을 때
          const user = result[0] // 쿼리 결과의 첫 번째 사용자 정보

          bcrypt.compare(password, user.password, (err, result) => { // 비밀번호 검사
            if(err) throw err;
            if(result === true){ 

              try{
                // access Token 발급
                const accesstoken = jwt.sign({
                  email: user.email,
                  name: user.name
                }, process.env.ACCESS_SECRET, {
                  expiresIn : '1m',
                  issuer : 'PRMe', 
                });

                // refresh Token 발급
                const refreshtoken = jwt.sign({
                  email: user.email,
                  name: user.name
                }, process.env.REFRESH_SECRET, {
                  expiresIn : '24h',
                  issuer : 'PRMe', 
                });
  
                sendData.isLogin = "성공";
                sendData.name = user.name;
                
                sendData.accesstoken = accesstoken;
                sendData.refreshtoken = refreshtoken;
                return res.json(sendData);
                
              } catch (error) {
                res.status(500).json(error);
              }

            } else {
              sendData.isLogin = "이메일 또는 비밀번호를 확인하여주세요.";
              return res.json(sendData);
            }
          })
        } else {
          // 일치하는 이메일이 없을 때
          sendData.isLogin = "이메일 또는 비밀번호를 확인하여주세요.";
          return res.json(sendData);
        }
      });
    } catch (error){
      sendData.isLogin = "오류가 발생했습니다.";
      return res.json(sendData);
    }
  }

});

// accessToken 인증 (만료기간이 있음)
app.get("/accessT", (req, res) => {
  try {
    const token = req.cookies.accessToken; // (만료기간이 있는 데이터) 쿠키에 있는 accessToken의 value 빼내옴
    const data = jwt.verify(token, process.env.ACCESS_SECRET); // (만료기간이 있는 데이터) accessToken검증 후 데이터 가져오기

    const email = data.email; // (만료기간이 있는 데이터) accessToken으로 인증된 email
    db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
      if (result.length > 0){ // 일치하는 이메일이 있을 때
        const user = result[0] // 쿼리 결과의 첫 번째 사용자 정보

        const userData = { email:"", name:"" }; // 만료기간이 없는 데이터
        userData.email = user.email;
        userData.name = user.name;
    
        return res.send(userData); 
      }})
    } catch (error){
      return res.send(error.name);
    }
});

// refreshToken - 만료된 accessToken 갱신
app.get("/refreshT", (req, res) => {
  try {
      const token = req.cookies.refreshToken; // refreshToken의 value
      const data = jwt.verify(token, process.env.REFRESH_SECRET); // refreshToken검증 후 데이터 가져오기
  
      // db email과 같을 시 accessToken발급
      const email = data.email; // refreshToken으로 인증된 email
    db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
      if (result.length > 0){ // 일치하는 이메일이 있을 때
        const user = result[0] // 쿼리 결과의 첫 번째 사용자 정보
        
        // accessToken 새로 발급
        const accesstoken = jwt.sign({
          email: user.email,
          name: user.name
        }, process.env.ACCESS_SECRET, {
          expiresIn : '10m',
          issuer : 'PRMe', 
        });
  
        // refresh Token 발급
        const refreshtoken = jwt.sign({
          email: user.email, // user을 db검사 쿼리해서 나온 배열로 바꾸기
          name: user.name
        }, process.env.REFRESH_SECRET, {
          expiresIn : '24h',
          issuer : 'PRMe', 
        });

        const sendData = { isLogin: "", email:"", name: "", accesstoken: "", refreshtoken: "" };
        sendData.isLogin = "성공";
        sendData.email = user.email;
        sendData.name = user.name;
        sendData.accesstoken = accesstoken;
        sendData.refreshtoken = refreshtoken;

        return res.json(sendData);
      }});
    } catch (error){
      return res.send("응답실패... " + error);
    }
});



/* --------------------- 이메일 전송 함수 --------------------- */
app.post("/sendmail", (req, res) => {
  // 코드 출처 - https://nodemailer.com/about/
  const transporter= nodemailer.createTransport({
    "service": 'naver',
    "host": 'smtp.naver.com',
    "port": 465,
    auth:{
      user:"uu401@naver.com", // 보내는 메일 주소
      pass: "@네이버비밀번호@", // 보내는 메일 비밀번호
    }
  });

  const mailOptions = {
    from: 'uu401@naver.com',  // 송신할 네이버 메일
    to: req.body.email,  // 수신자 아이디
    subject: '0601 테스트 중', // 이메일 제목
    html: '안녕하십니까. 반갑습니다.', // 이메일 내용
  };
  
  // 두번째 인자로 콜백 함수를 넣어주면 await x
  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      res.sendStatus(500); // 이메일 전송 실패 시 500 응답
    } else {
      console.log('Successfully Send Email.', info.response);
      transporter.close();
      res.sendStatus(200); // 성공 시 ok 응답
    }
  });
});


/* --------------------- myTest 함수 --------------------- */
app.get("/home/test", (req, res) => {
  try {
    const result = req.query.result;
    const intResult = result.map((value) => parseFloat(value)); // 문자형 -> 실수형
  
    const token = req.cookies.refreshToken; 
    const data = jwt.verify(token, process.env.REFRESH_SECRET); 
    const email = data.email; 
  
    // 이메일 검사
    db.query("SELECT * FROM mytestsave WHERE email = ?", [email], function(err, result){
      if (err) throw err;
      if (result.length > 0){ // 일치하는 이메일이 있으면 Update
        const myTestUpdateQuery = 'UPDATE mytestsave SET ISTJ=?,ISFJ=?,INFJ=?,INTJ=?,ISTP=?,ISFP=?,INFP=?,INTP=?,ESTP=?,ESFP=?,ENFP=?,ENTP=?,ESTJ=?,ESFJ=?,ENFJ=?,ENTJ=?,E=?,N=?,F=?,J=?, date = CURDATE() WHERE email = ?';
        db.query(myTestUpdateQuery, [...intResult, email], (err, result) => {
          res.send(intResult);
        });
  
      } else { // 이메일이 없으면 Insert
        const resultQuery = "INSERT INTO mytestsave(email,ISTJ,ISFJ,INFJ,INTJ,ISTP,ISFP,INFP,INTP,ESTP,ESFP,ENFP,ENTP,ESTJ,ESFJ,ENFJ,ENTJ,E,N,F,J)VALUES (?,?)";
        db.query(resultQuery, [email, intResult], function(err, result) {
          res.send(intResult);
        });
      }
    });
  } catch (error) {
    return res.send(error);
  }
});


/* --------------------- myPage 함수 --------------------- */
// 최근 검사일 조회 
app.post("/recently", async(req, res) => {
  try {
    const token = req.cookies.accessToken;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    const email = data.email;

    // 이메일 검사
    db.query("SELECT * FROM mytestsave WHERE email = ?", [email], function(err, result){
      if (err) throw err;
      if (result.length > 0){
        const user = result[0]; // 쿼리 결과의 첫 번째 사용자 정보
        return res.send(user.date);

      } else {
        return res.send("");
      }
    });
  } catch (error) {
    return res.send("(새로고침 해주세요.)");
  }
});

// 닉네임 수정
app.post("/saveName", async(req, res) => {
  try {
    const token = req.cookies.accessToken;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    const name = req.body.name;
    const email = data.email;

    const sendData = { text:"", emoji:"" };

    // 이메일 검사
    db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
      if (err) throw err;
      if (result.length > 0){ // 일치
        // 닉네임 중복 검사
        db.query("SELECT * FROM user WHERE name = ?", [name], function(err,result){
          if(err) throw err;
          if(result.length > 0) {
            // 업데이트 실패
            sendData.text = "중복된 닉네임 입니다.";
            sendData.emoji = "❌";

            return res.send(sendData);
            
          } else {
            const updateNameQuery = 'UPDATE user SET name=? WHERE email = ?';
            db.query(updateNameQuery, [name, email], (err, result) => {
              // 업데이트 성공
              sendData.text = "닉네임을 저장하였습니다.";
              sendData.emoji = "✅";

              return res.send(sendData);
            });
          }
        });
      };
    });
  } catch (error) {
    return res.send("응답실패... " + error);
  }
});

// 회원 탈퇴
app.post("/secession", async(req, res) => {
  try {
    const token = req.cookies.accessToken;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    const email = data.email;

    // 이메일 검사
    db.query("SELECT * FROM user WHERE email = ?", [email], function(err, result){
      if (err) throw err;
      if (result.length > 0){ // 일치
        // 유저 삭제
        const deleteUserQuery = 'DELETE FROM user WHERE email = ?';
        db.query(deleteUserQuery, [email], (err, result) => {
          res.send("삭제");
        });
      }});
  } catch (error) {
    return res.send("응답실패... " + error);
  }
});

/* --------------------- Home 함수 --------------------- */
app.get("/home", (req, res) => {
  try {
    const token = req.cookies.accessToken;
    const data = jwt.verify(token, process.env.ACCESS_SECRET);
    const email = data.email;

    db.query("SELECT * FROM MyTestSave WHERE email = ?", [email], function(err, result){
      if (result.length > 0){ 
        const user = result[0];

        const sendData = { email: "", ISTJ:"", ISFJ:"",INFJ:"",INTJ:"",ISTP:"",ISFP:"",INFP:"",INTP:"",ESTP:"",ESFP:"",ENFP:"",ENTP:"",ESTJ:"",ESFJ:"",ENFJ:"",ENTJ:""};
        const sendData2 = {E:"", N:"", F:"", J:""};
        sendData.email = user.email;
        sendData.ISTJ = user.ISTJ;
        sendData.ISFJ = user.ISFJ;
        sendData.INFJ = user.INFJ;
        sendData.INTJ = user.INTJ;
        sendData.ISTP = user.ISTP;
        sendData.ISFP = user.ISFP;
        sendData.INFP = user.INFP;
        sendData.INTP = user.INTP;
        sendData.ESTP = user.ESTP;
        sendData.ESFP = user.ESFP;
        sendData.ENFP = user.ENFP;
        sendData.ENTP = user.ENTP;
        sendData.ESTJ = user.ESTJ;
        sendData.ESFJ = user.ESFJ;
        sendData.ENFJ = user.ENFJ;
        sendData.ENTJ = user.ENTJ;
        sendData2.E = user.E;
        sendData2.N = user.N;
        sendData2.F = user.F;
        sendData2.J = user.J;

        // 그렇다(2점)
        const score2 = [];
        for (const key in sendData) {
          if (sendData[key] === 2) {
            score2.push(key);
          }
        };

        // 보통이다(1점)
        const score1 = [];
        for (const key in sendData) {
          if (sendData[key] === 1) {
            score1.push(key);
          }
        };

        let E = 0;
        let I = 0;
        let N = 0;
        let S = 0;
        let F = 0;
        let T = 0;
        let P = 0;
        let J = 0;

        // 그렇다 (2점) 계산
        for (let i = 0; i < score2.length; i++) {
          const EnI = score2[i][0];
          const NnS = score2[i][1];
          const FnT = score2[i][2];
          const PnJ = score2[i][3];
        
          if (EnI === 'I') {
            I += 2;
          } else {
            E += 2;
          }
        
          if (NnS === 'N') {
            N += 2;
          } else {
            S += 2;
          }

          if (FnT === 'F') {
            F += 2;
          } else {
            T += 2;
          }

          if (PnJ === 'P') {
            P += 2
          } else {
            J += 2;
          }
        };

        // 그렇다 (1점) 계산
        for (let i = 0; i < score1.length; i++) {
          const EnI = score1[i][0];
          const NnS = score1[i][1];
          const FnT = score1[i][2];
          const PnJ = score1[i][3];
        
          if (EnI === 'I') {
            I += 1;
          } else {
            E += 1;
          }
        
          if (NnS === 'N') {
            N += 1;
          } else {
            S += 1;
          }

          if (FnT === 'F') {
            F += 1;
          } else {
            T += 1;
          }

          if (PnJ === 'P') {
            P += 1;
          } else {
            J += 1;
          }
        };

        // 마지막 4문항
        if (sendData2.E === 0.5){
          E += 0.5;
        } else {
          I += 0.5;
        }

        if (sendData2.N === 0.5){
          N += 0.5;
        } else {
          S += 0.5;
        }

        if (sendData2.F === 0.5){
          F += 0.5;
        } else {
          T += 0.5;
        }

        if (sendData2.J === 0.5){
          J += 0.5;
        } else {
          P += 0.5;
        }

        const sendMbti = { E:"", I:"", N:"", S:"", F:"", T:"" , P:"", J:"" };
        sendMbti.E = E;
        sendMbti.I = I;
        sendMbti.N = N;
        sendMbti.S = S;
        sendMbti.F = F;
        sendMbti.T = T;
        sendMbti.P = P;
        sendMbti.J = J;
    
        return res.send(sendMbti); 
      }
    });
  } catch(error){
    return res.send("응답실패... " + error);
  }

})