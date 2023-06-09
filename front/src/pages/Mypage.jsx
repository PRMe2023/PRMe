import React, { useState, useEffect }  from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal3 from '../components/Modal3';

const Mypage = () => {
  const server = 'http://localhost:3002';
  const front = 'http://localhost:3000';
  const Navigate = useNavigate();

  const imgUrl = '/images/default.svg';

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userDate, setUserDate] = useState('');
  const [inputName, setInputName] = useState('');
  
  /* ------------------탈퇴 모달 ------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const modal_text = '정말 탈퇴하시겠습니까?'; 
  const modal_emoji = '😭';

  const openModal = () => {
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
  };

   /* ------------------저장 모달 ------------------ */
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalemoji, setModalEmoji] = useState('');
  
  const saveOpenModal = () => {
    setSaveModalOpen(true);
  };
  const saveCloseModal = () => {
    setSaveModalOpen(false);
  };

  /* ------------------ jwt 인증 ------------------ */
  const accessT = () => {
    axios
    .get(`${ server }/accessT`, {
       withCredentials: true, // 요청 시 쿠키를 포함
    })
    .then(response => {
      if(response.data === 'TokenExpiredError'){ // accessToken 만료 시
        refreshT(); // 토큰 재발행
      } else {
        setUserEmail(response.data.email);
        setUserName(response.data.name);
      }
    })
    .catch(error => {
      console.log('실패했어요:', error.response);
    })
  };

  // 토큰 재발행
  const refreshT = () => {
    axios
    .get(`${ server }/refreshT`, {
       withCredentials: true, // 요청 시 쿠키를 포함
    })
    .then(response => {
      // accessToken 갱신완료 시
      if(JSON.stringify(response.data.isLogin) === '"성공"'){
        // 서버로부터 토큰을 받아서 쿠키에 저장
       const accessToken = response.data.accesstoken;
       const refreshToken = response.data.refreshtoken;
       // 쿠키에 토큰 저장
       document.cookie = `accessToken=${ accessToken }; path=/;`
       document.cookie = `refreshToken=${ refreshToken }; path=/;`

       setUserEmail(response.data.email);
       setUserName(response.data.name);
      }     
    })
    .catch(error => {
      console.log('실패했어요:', error.response);
    })
  };

  /* ------------------ 최근 검사일 조회 요청 ------------------ */
  const recently = () => {
    axios
    .post(`${ server }/recently`,
      { },
      { withCredentials: true,},)
    .then(response => {
      if(response.data === ""){
        setUserDate("(미실시)");
      } else {
        let date = response.data;
        setUserDate(date.split('T')[0]); // YYYY-MM-DD
      };
    })
    .catch(error => {
      console.log('실패했어요:', error.response);
    })
  }

   /* ------------------ 회원 탈퇴 요청  ------------------ */
  const secession = () => {
    // 토큰 검사
    accessT();
    // 회원 탈퇴 요청
    axios
    .post(`${ server }/secession`,
      { },
      { withCredentials: true,},
    )
    .then(response => {
      function deleteCookie(name) { // 쿠키삭제
        document.cookie = `${ name }=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
      deleteCookie('accessToken');
      deleteCookie('refreshToken');
      closeModal(); // 모달 off
      Navigate('/');
    })
    .catch(error => {
      closeModal();
    });
  };

   /* ------------------닉네임 수정 요청  ------------------ */
  const saveName = () => {
    // 토큰 검사
    accessT();
    // 닉네임 수정 통신
    if(inputName === ""){
      alert("닉네임을 적어주세요.");
    }
    else {
      axios
      .post(`${ server }/saveName`,
        { name: inputName, },
        { withCredentials: true,},
      )
      .then(response => {
        setModalText(response.data.text);
        setModalEmoji(response.data.emoji);
        saveOpenModal(); // 모달 on
      })
      .catch(error => {
        alert("요청이 실패했어요.");
      });
    };
  };
  
  // 중복 전송을 막기 위한 동기적 리다이렉트
  function redirect() {
    window.location.href = `${ front }/home/mypage`;
  };

  /* ------------------ 페이지 첫 실행 ------------------ */
  useEffect(() => {
    if(document.cookie){
      accessT();
      recently(); // 최근 검사일 출력
    } else {
      Navigate('/login')
    }
  }, []);

  // test 페이지로 이동 -- Link 쓰는게 더 나을지도
  const test = () => {
    Navigate('/home/test');
  };
  /* ---------------------------------------------------- */

  return (
    <div className='mypage'>
      <div className='mypage-content'>
        
        <div className='mypage-content-top'>
          <div className='profile-hover'>+</div>
          <div className='profile' id='mypage-prorile'>
            <img src={ imgUrl } className='default'/>
          </div>
          <div className='mypage-settings'>
          <div className={`mypage-settings-title ${window.innerWidth <= 768 ? 'hide-title' : ''}`}>기본 정보</div>

            <div className='mypage-setting1'>
              <div className='mypage-subtitle'>닉네임</div>
              <input type="text" placeholder={ userName } id='name' maxLength="10"
                onChange={(event) => {
                  setInputName(event.target.value);
                }}
              />
            </div>

            <div className='mypage-setting2'>
              <div className='mypage-subtitle'>이메일</div>
              <div className='mypage-fixed'>{ userEmail }</div>
            </div>

            <div className='mypage-setting3'>
              <div className='mypage-subtitle'>검사일</div>
              <div className='mypage-fixed'>{ userDate }</div>
            </div>

          </div>
        </div>

        <div className='delete-save'>
          <button onClick={ openModal } className='mypage-delete'>탈퇴하기</button>
          <button onClick={ saveName } className='mypage-save'>저장하기</button>
        </div>
      </div>

      <div className='mypage-buttons'>
        <button>테스트 결과 보기</button>
        <button id='retry' onClick={ test }>테스트 다시 하기</button>
      </div>

      <Modal3 open={ modalOpen } close={ closeModal } header="탈퇴하기">
        <span id='modal-text'>{ modal_text }</span>
        <span id='modal-emoji'>{ modal_emoji }</span>
        <footer>
          <div className='modal2-buttons'>
            <button id='modal-close' onClick={ secession }>확인</button>
            <button id='modal-close' onClick={ closeModal }>취소</button>
          </div>
        </footer>
      </Modal3>

      <Modal3 open={ saveModalOpen } close={ saveCloseModal } header="저장하기">
        <span id='modal-text'> { modalText } </span>
        <span id='modal-emoji'> { modalemoji } </span>
        <footer>
          <div className='modal2-buttons'>
            <button id='modal-close' onClick={ redirect }>확인</button>
          </div>
        </footer>
      </Modal3>

    </div>
  )
}

export default Mypage;